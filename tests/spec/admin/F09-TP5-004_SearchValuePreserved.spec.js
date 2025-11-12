import { createSalesEntryLauncherHarness } from '../../fixtures/salesEntryLauncherHarness.js';

describe('SPEC F09-TP5-004: Search field retains value and context while launching sale flow', () => {
  test('typing in search and launching Record sale keeps the search field untouched and button aria-controls points to the panel', async () => {
    const harness = await createSalesEntryLauncherHarness();
    harness.adminSearch.value = 'asmi';

    harness.clickRecordSale();

    expect(harness.adminSearch.value).toBe('asmi');
    expect(harness.recordSaleBtn.getAttribute('aria-controls')).toBe('saleEntryPanel');
    expect(harness.recordSaleBtn.classList.contains('btn')).toBe(true);
  });
});
