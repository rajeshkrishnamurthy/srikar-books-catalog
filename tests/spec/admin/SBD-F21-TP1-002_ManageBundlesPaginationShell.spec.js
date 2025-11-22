import { jest } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';

describe('SPEC SBD-F21-TP1-002: Manage Bundles pagination shell mirrors controller state', () => {
  test('summary, busy indicator, and Prev/Next wiring sync with controller updates', async () => {
    const controller = buildPaginationControllerStub([
      {
        summaryText: 'Bundles 1–20 of 180',
        prevDisabled: true,
        nextDisabled: true,
        isBusy: true,
      },
    ]);
    const createPaginationController = jest.fn((config = {}) => {
      controller.__config = config;
      return controller;
    });

    const harness = await createAdminMainHarness({
      manageBundles: { createPaginationController },
    });

    try {
      await harness.simulateSignIn();
      fireEvent.click(harness.bundlesNavButton);
      const manageTab = document.querySelector(
        '#bundlesSubNav [data-manage-tab="manage"]'
      );
      fireEvent.click(manageTab);

      const container = document.getElementById('bundlePagination');
      const summary = document.getElementById('bundlePaginationSummary');
      const prevButton = document.getElementById('bundlePaginationPrev');
      const nextButton = document.getElementById('bundlePaginationNext');
      expect(container).not.toBeNull();
      expect(summary).not.toBeNull();

      controller.__config?.onStateChange?.();
      expect(container?.getAttribute('aria-busy')).toBe('true');
      expect(prevButton?.disabled).toBe(true);
      expect(nextButton?.disabled).toBe(true);
      expect(summary?.textContent).toBe('Bundles 1–20 of 180');

      controller.__setUiState({
        summaryText: 'Bundles 21–40 of 180',
        prevDisabled: false,
        nextDisabled: false,
        isBusy: false,
      });
      controller.__config?.onStateChange?.();

      expect(container?.getAttribute('aria-busy')).toBe('false');
      expect(summary?.textContent).toBe('Bundles 21–40 of 180');
      expect(prevButton?.disabled).toBe(false);
      expect(nextButton?.disabled).toBe(false);

      fireEvent.click(nextButton);
      expect(controller.goNext).toHaveBeenCalledTimes(1);

      fireEvent.click(prevButton);
      expect(controller.goPrev).toHaveBeenCalledTimes(1);
    } finally {
      harness.cleanup();
    }
  });
});
