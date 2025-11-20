import { fireEvent } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import { buildAvailableAndSoldControllerFactory } from '../../fixtures/availableSoldControllerFactory.js';

describe('SPEC SBD-F20-TP2-002: Sold pagination busy state', () => {
  test('busy summaries disable Prev/Next until the controller finishes loading', async () => {
    const availableController = buildPaginationControllerStub();
    const soldController = buildPaginationControllerStub([
      {
        summaryText: 'Items 1\u201320 of 100',
        prevDisabled: true,
        nextDisabled: true,
        isBusy: true,
      },
    ]);

    const controllerFactory = buildAvailableAndSoldControllerFactory(
      availableController,
      soldController
    );

    const harness = await createAdminInventoryHarness({
      paginationControllerFactory: controllerFactory,
    });

    const soldPagination = harness.soldPagination;
    const prevButton = harness.soldPrevButton;
    const nextButton = harness.soldNextButton;

    expect(soldPagination?.getAttribute('aria-busy')).toBe('true');
    expect(prevButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(true);

    fireEvent.click(prevButton);
    fireEvent.click(nextButton);

    expect(soldController.goPrev).not.toHaveBeenCalled();
    expect(soldController.goNext).not.toHaveBeenCalled();

    soldController.__setUiState({
      summaryText: 'Items 21\u201340 of 100',
      prevDisabled: false,
      nextDisabled: false,
      isBusy: false,
    });
    soldController.__config?.onStateChange?.();

    expect(soldPagination?.getAttribute('aria-busy')).toBe('false');
    expect(prevButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(false);

    fireEvent.click(nextButton);
    expect(soldController.goNext).toHaveBeenCalledTimes(1);
  });
});
