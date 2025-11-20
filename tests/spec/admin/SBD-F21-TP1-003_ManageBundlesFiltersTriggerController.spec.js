import { jest } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';

describe('SPEC SBD-F21-TP1-003: Manage Bundles filters drive pagination requests', () => {
  test('supplier/status filters and page-size selector push updates through the controller', async () => {
    const controller = buildPaginationControllerStub();
    controller.setFilters = jest.fn();
    controller.setPageSize = jest.fn();
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

      const supplierSelect = document.getElementById('bundleFilterSupplier');
      const statusSelect = document.getElementById('bundleFilterStatus');
      expect(supplierSelect).not.toBeNull();
      expect(statusSelect).not.toBeNull();

      supplierSelect.value = 'sup-42';
      fireEvent.change(supplierSelect);
      const supplierFilters = controller.setFilters.mock.calls[0]?.[0] || {};
      expect(supplierFilters.supplierId).toBe('sup-42');

      statusSelect.value = 'Published';
      fireEvent.change(statusSelect);
      const statusFilters =
        controller.setFilters.mock.calls[
          controller.setFilters.mock.calls.length - 1
        ]?.[0] || {};
      expect(statusFilters.status).toBe('Published');

      const pageSizeSelect = document.getElementById('bundlePaginationSize');
      expect(pageSizeSelect).not.toBeNull();
      pageSizeSelect.value = '50';
      fireEvent.change(pageSizeSelect);
      expect(controller.setPageSize).toHaveBeenCalledWith(50);
    } finally {
      harness.cleanup();
    }
  });
});
