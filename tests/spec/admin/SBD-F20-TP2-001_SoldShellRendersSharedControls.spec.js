import { within } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import { buildAvailableAndSoldControllerFactory } from '../../fixtures/availableSoldControllerFactory.js';

describe('SPEC SBD-F20-TP2-001: Sold pagination shell mirrors shared controls', () => {
  test('Sold shell instantiates its own controller and renders summary text with accessible controls', async () => {
    const availableController = buildPaginationControllerStub();
    const soldController = buildPaginationControllerStub([
      {
        summaryText: 'Items 21\u201340 of 180',
        prevDisabled: false,
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

    expect(controllerFactory).toHaveBeenCalledTimes(2);

    const soldPagination = harness.soldPagination;
    expect(soldPagination).not.toBeNull();
    expect(soldPagination?.getAttribute('aria-busy')).toBe('false');

    const summary = harness.soldSummary;
    expect(summary?.textContent).toBe('Items 21\u201340 of 180 - Sold');
    expect(summary?.getAttribute('aria-live')).toBe('polite');

    const { getByRole } = within(soldPagination);
    const prevButton = getByRole('button', { name: /previous page/i });
    const nextButton = getByRole('button', { name: /next page/i });

    expect(prevButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(true);
    expect(prevButton.getAttribute('aria-controls')).toBe('soldList');
    expect(nextButton.getAttribute('aria-controls')).toBe('soldList');
  });
});
