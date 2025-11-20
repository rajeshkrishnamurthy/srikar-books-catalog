import { jest } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';

describe('SPEC SBD-F21-TP1-001: Manage Bundles mounts shared pagination suite', () => {
  test('opening Manage Bundles instantiates the pagination controller with bundle-specific config', async () => {
    const controller = buildPaginationControllerStub();
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
      expect(manageTab).not.toBeNull();
      fireEvent.click(manageTab);

      expect(createPaginationController).toHaveBeenCalledTimes(1);

      const config = controller.__config;
      expect(config?.defaultPageSize).toBe(20);
      expect(config?.pageSizeOptions).toEqual([10, 20, 50]);
      expect(config?.mode).toBe('pager');
      expect(typeof config?.dataSource).toBe('function');
      expect(typeof config?.onStateChange).toBe('function');
      expect(typeof config?.adapters?.parseLocation).toBe('function');
      expect(typeof config?.adapters?.syncLocation).toBe('function');

      const summary = document.getElementById('bundlePaginationSummary');
      expect(summary?.getAttribute('aria-live')).toBe('polite');
    } finally {
      harness.cleanup();
    }
  });
});
