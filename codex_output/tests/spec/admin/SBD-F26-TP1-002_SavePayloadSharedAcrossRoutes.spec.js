const {
  mountBundleCompositionHarness,
  flushMicrotasks
} = require('../../fixtures/bundleCompositionHarness');

describe('SPEC SBD-F26-TP1-002: Contract-shaped save payload shared across routes', () => {
  test('Saving from bundle create and inline flows uses the same document shape and pricing math', async () => {
    const computeRecommendation = jest.fn(({ bookSelections = [] }) => {
      const totalSale = bookSelections.reduce((sum, book) => sum + (book.salePriceMinor || 0), 0);
      const totalMrp = bookSelections.reduce((sum, book) => sum + (book.mrpMinor || 0), 0);
      const recommendedPriceMinor = Math.round(totalSale * 0.75);

      return Promise.resolve({
        recommendedPriceMinor,
        totalSalePriceMinor: totalSale,
        totalMrpMinor: totalMrp,
        recommendationComputedAt: 5678
      });
    });
    const saveBundle = jest.fn().mockResolvedValue({ bundleId: 'bundle-shared' });

    const { importError, mountError, elements, adapters } = await mountBundleCompositionHarness({
      adapters: { computeRecommendation, saveBundle }
    });

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    elements.bundleAddButtons[0].click();
    elements.bundleAddButtons[1].click();
    await flushMicrotasks();

    elements.bundleSaveButton.click();
    await flushMicrotasks();

    elements.inlineSaveButton.click();
    await flushMicrotasks();

    expect(adapters.saveBundle).toHaveBeenCalledTimes(2);
    const [firstPayload] = adapters.saveBundle.mock.calls[0] || [];
    const [secondPayload] = adapters.saveBundle.mock.calls[1] || [];

    expect(firstPayload).toEqual(secondPayload);
    expect(firstPayload?.books?.map((book) => book.bookId)).toEqual(['book-1', 'book-2']);
    expect(firstPayload?.books?.map((book) => book.position)).toEqual([1, 2]);
    expect(firstPayload?.totals?.totalSalePriceMinor).toBe(3000);
    expect(firstPayload?.pricing?.recommendedPriceMinor).toBe(Math.round(3000 * 0.75));
    expect(firstPayload?.pricing?.recommendationThreshold).toBe(2);
  });
});
