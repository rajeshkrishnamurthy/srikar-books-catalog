const {
  mountBundleCompositionHarness,
  flushMicrotasks
} = require('../../fixtures/bundleCompositionHarness');

describe('SPEC SBD-F26-TP1-003: Selection order and threshold gating across routes', () => {
  test('Cross-route additions preserve order/positions and withhold recommendation until the second book', async () => {
    const { importError, mountError, elements, adapters } = await mountBundleCompositionHarness();

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    elements.inlineAddButtons[1].click();
    await flushMicrotasks();
    expect(adapters.computeRecommendation).not.toHaveBeenCalled();

    elements.bundleAddButtons[0].click();
    await flushMicrotasks();

    expect(adapters.computeRecommendation).toHaveBeenCalledTimes(1);
    const [payload] = adapters.computeRecommendation.mock.calls[0] || [];
    expect(payload.bookSelections.map((book) => book.bookId)).toEqual(['book-2', 'book-1']);

    elements.inlineSaveButton.click();
    await flushMicrotasks();

    const [savedDocument] = adapters.saveBundle.mock.calls[0] || [];
    expect(savedDocument?.books?.map((book) => book.bookId)).toEqual(['book-2', 'book-1']);
    expect(savedDocument?.books?.map((book) => book.position)).toEqual([1, 2]);
    expect(savedDocument?.pricing?.recommendedPriceMinor).toBe(Math.round((1800 + 1200) * 0.75));
  });
});
