import { createSalesEntryLauncherHarness } from '../../fixtures/salesEntryLauncherHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP5-002: Record sale button opens the sale panel', () => {
  test('clicking the button opens the panel, scrolls it into view, and focuses the sale header date input', async () => {
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const harness = await createSalesEntryLauncherHarness({
      startSaleWorkflow: jest.fn(),
    });

    harness.saleEntryPanel.open = false;
    harness.clickRecordSale();

    expect(harness.saleEntryPanel.open).toBe(true);
    expect(scrollSpy).toHaveBeenCalled();
    expect(harness.saleHeaderSaleDate.focus).toHaveBeenCalled();
    scrollSpy.mockRestore();
  });
});
