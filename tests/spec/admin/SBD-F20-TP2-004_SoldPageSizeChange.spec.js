import { fireEvent } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import { buildAvailableAndSoldControllerFactory } from '../../fixtures/availableSoldControllerFactory.js';

describe('SPEC SBD-F20-TP2-004: Sold page size control', () => {
  test('Rows per page select updates controller and rejects invalid values', async () => {
    const availableController = buildPaginationControllerStub();
    const soldController = buildPaginationControllerStub([
      {
        summaryText: 'Items 1\u201320 of 60',
        prevDisabled: true,
        nextDisabled: true,
        isBusy: false,
      },
    ]);

    const controllerFactory = buildAvailableAndSoldControllerFactory(
      availableController,
      soldController
    );

    const harness = await createAdminInventoryHarness({
      paginationControllerFactory: controllerFactory,
    });

    const pageSizeSelect = harness.soldPageSizeSelect;
    expect(pageSizeSelect?.value).toBe('20');

    pageSizeSelect.value = '50';
    fireEvent.change(pageSizeSelect);
    expect(soldController.setPageSize).toHaveBeenCalledWith(50);

    pageSizeSelect.value = '';
    fireEvent.change(pageSizeSelect);
    expect(soldController.setPageSize).toHaveBeenCalledTimes(1);
    expect(pageSizeSelect.value).toBe('20');
  });
});
