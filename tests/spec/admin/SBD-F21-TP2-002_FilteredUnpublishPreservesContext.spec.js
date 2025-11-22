import { jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import { buildBundleListDomStub } from '../../fixtures/manageBundlesListStub.js';

describe('SPEC SBD-F21-TP2-002: Filtered unpublish keeps pagination context', () => {
  test('unpublishing a filtered bundle refetches the same page without resetting filters', async () => {
    const controller = buildPaginationControllerStub();
    controller.refresh = jest.fn();
    controller.setFilters = jest.fn();
    const createPaginationController = jest.fn((config = {}) => {
      controller.__config = config;
      return controller;
    });
    const initBundleList = buildBundleListDomStub();
    const harness = await createAdminMainHarness({
      manageBundles: { createPaginationController, initBundleList },
    });
    const firebase = globalThis.__firebaseMocks?.exports;
    firebase.updateDoc.mockClear();

    try {
      await harness.simulateSignIn();
      await openManageBundlesTab(harness);

      const statusSelect = document.getElementById('bundleFilterStatus');
      expect(statusSelect).not.toBeNull();
      statusSelect.value = 'Published';
      fireEvent.change(statusSelect);
      expect(controller.setFilters).toHaveBeenCalled();

      const bundleListApi = initBundleList.mock.results[0]?.value;
      expect(bundleListApi).toBeTruthy();
      bundleListApi.setBundles([
        {
          id: 'bundle-pub',
          title: 'Published bundle',
          status: 'Published',
          books: [],
          bookIds: [],
          supplier: { id: 'sup-9', name: 'Paper Trail' },
        },
      ]);

      controller.refresh.mockClear();

      const toggle = document.querySelector(
        '#bundleResults input[aria-label="Publish bundle"]'
      );
      expect(toggle).not.toBeNull();
      expect(toggle.checked).toBe(true);

      fireEvent.click(toggle);

      await waitFor(() => expect(firebase.updateDoc).toHaveBeenCalledTimes(1));
      expect(controller.refresh).toHaveBeenCalledTimes(1);
      expect(window.location.search).toBe('');
    } finally {
      harness.cleanup();
    }
  });
});

async function openManageBundlesTab(harness) {
  fireEvent.click(harness.bundlesNavButton);
  const manageTab = document.querySelector(
    '#bundlesSubNav [data-manage-tab="manage"]'
  );
  expect(manageTab).not.toBeNull();
  fireEvent.click(manageTab);
  await Promise.resolve();
}
