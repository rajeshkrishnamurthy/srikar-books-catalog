import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import { buildAvailableAndSoldControllerFactory } from '../../fixtures/availableSoldControllerFactory.js';

describe('SPEC SBD-F20-TP2-003: Sold summary announces range', () => {
  test('summary text updates with controller state and stays aria-live=polite', async () => {
    const availableController = buildPaginationControllerStub();
    const soldController = buildPaginationControllerStub([
      {
        summaryText: 'Items 1\u201320 of 140',
        prevDisabled: true,
        nextDisabled: false,
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

    const summary = harness.soldSummary;
    expect(summary?.textContent).toBe('Items 1\u201320 of 140 - Sold');
    expect(summary?.getAttribute('aria-live')).toBe('polite');

    soldController.__setUiState({
      summaryText: 'Items 41\u201360 of 140',
      prevDisabled: false,
      nextDisabled: true,
      isBusy: false,
    });
    soldController.__config?.onStateChange?.();

    expect(summary?.textContent).toBe('Items 41\u201360 of 140 - Sold');
    expect(summary?.getAttribute('aria-live')).toBe('polite');
  });
});
