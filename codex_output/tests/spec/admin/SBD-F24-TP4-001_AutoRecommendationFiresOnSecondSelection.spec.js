const {
  mountInlineBundleComposerHarness,
  addBooks,
  defaultBooks
} = require('../../fixtures/inlineBundleComposerHarness');

describe('SPEC SBD-F24-TP4-001: Auto recommendation fires on second selection', () => {
  test('Selecting a second book triggers fetchPriceRecommendation with both ids and currency', async () => {
    const fetchPriceRecommendation = jest.fn().mockResolvedValue({
      recommendedPriceMinor: 5400,
      totalSalePriceMinor: 4200,
      totalMrpMinor: 7600
    });

    const { importError, mountError, api, adapters } = await mountInlineBundleComposerHarness({
      adapters: { fetchPriceRecommendation }
    });

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    await addBooks(api, [defaultBooks[0]]);
    expect(adapters.fetchPriceRecommendation).not.toHaveBeenCalled();

    await addBooks(api, [defaultBooks[1]]);
    expect(adapters.fetchPriceRecommendation).toHaveBeenCalledTimes(1);
    expect(adapters.fetchPriceRecommendation).toHaveBeenCalledWith({
      bookIds: ['book-1', 'book-2'],
      currency: 'INR'
    });
  });
});
