import { createSalesEntryLauncherHarness } from '../../fixtures/salesEntryLauncherHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP5-003: Launcher initializes sale workflow once on first activation', () => {
  test('startSaleWorkflow runs only after the first click and not on repeated activations', async () => {
    const startSaleWorkflow = jest.fn();
    const harness = await createSalesEntryLauncherHarness({ startSaleWorkflow });

    expect(startSaleWorkflow).not.toHaveBeenCalled();

    harness.clickRecordSale();
    expect(startSaleWorkflow).toHaveBeenCalledTimes(1);

    harness.clickRecordSale();
    harness.pressRecordSaleEnter();
    expect(startSaleWorkflow).toHaveBeenCalledTimes(1);
  });
});
