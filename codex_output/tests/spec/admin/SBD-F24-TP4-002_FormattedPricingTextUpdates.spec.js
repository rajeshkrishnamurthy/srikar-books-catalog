const {
  mountInlineBundleComposerHarness,
  addBooks,
  defaultBooks,
  flushMicrotasks
} = require('../../fixtures/inlineBundleComposerHarness');

describe('SPEC SBD-F24-TP4-002: Pricing text refreshes via formatter', () => {
  test('Recommendation results update recommended and total sale price text with formatted values', async () => {
    const fetchPriceRecommendation = jest.fn().mockResolvedValue({
      recommendedPriceMinor: 2550,
      totalSalePriceMinor: 4200,
      totalMrpMinor: 5700
    });
    const formatPrice = jest
      .fn()
      .mockImplementation((valueInMinorUnits, currency) => `${currency} ${(valueInMinorUnits / 100).toFixed(2)}`);

    const { importError, mountError, api, adapters, elements } = await mountInlineBundleComposerHarness({
      adapters: { fetchPriceRecommendation, formatPrice }
    });

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    await addBooks(api, defaultBooks.slice(0, 2));
    await flushMicrotasks();

    expect(adapters.formatPrice).toHaveBeenCalledWith(2550, 'INR');
    expect(adapters.formatPrice).toHaveBeenCalledWith(4200, 'INR');
    expect(elements.recommendedPrice.textContent).toContain('INR 25.50');
    expect(elements.totalPrice.textContent).toContain('INR 42.00');
  });
});
