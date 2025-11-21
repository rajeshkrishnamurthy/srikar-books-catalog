const {
  mountBundleCompositionHarness,
  flushMicrotasks
} = require('../../fixtures/bundleCompositionHarness');

describe('SPEC SBD-F26-TP1-001: Shared discount after two selections across routes', () => {
  test('Second selection triggers computeRecommendation with 25% discount and updates both recommended fields', async () => {
    const computeRecommendation = jest.fn(({ bookSelections = [], currency, recommendationDiscountPct }) => {
      const totalSale = bookSelections.reduce((sum, book) => sum + (book.salePriceMinor || 0), 0);
      const totalMrp = bookSelections.reduce((sum, book) => sum + (book.mrpMinor || 0), 0);
      const recommendedPriceMinor = Math.round(totalSale * 0.75);

      return Promise.resolve({
        recommendedPriceMinor,
        totalSalePriceMinor: totalSale,
        totalMrpMinor: totalMrp,
        recommendationComputedAt: 1234,
        currency,
        recommendationDiscountPct
      });
    });

    const { importError, mountError, elements, adapters } = await mountBundleCompositionHarness({
      adapters: { computeRecommendation }
    });

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    elements.bundleAddButtons[0].click();
    await flushMicrotasks();
    expect(adapters.computeRecommendation).not.toHaveBeenCalled();

    elements.inlineAddButtons[1].click();
    await flushMicrotasks();

    expect(adapters.computeRecommendation).toHaveBeenCalledTimes(1);
    const payload = adapters.computeRecommendation.mock.calls[0]?.[0] || {};
    expect(payload.bookSelections.map((book) => book.bookId)).toEqual(['book-1', 'book-2']);
    expect(payload.recommendationDiscountPct).toBe(25);
    expect(payload.currency).toBe('INR');

    const lastState = adapters.onStateChange.mock.calls.pop()?.[0] || {};
    expect(lastState?.pricing?.recommendedPriceMinor).toBe(Math.round((1200 + 1800) * 0.75));
    expect(lastState?.pricing?.recommendationThreshold).toBe(2);
  });
});
