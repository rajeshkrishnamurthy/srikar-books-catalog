const {
  mountInlineBundleComposerHarness,
  addBooks,
  flushMicrotasks
} = require('../../fixtures/inlineBundleComposerHarness');

describe('SPEC SBD-F24-TP4-004: Total MRP fallback when data is missing', () => {
  test('Missing MRP data renders placeholder copy and still announces the change', async () => {
    const booksWithoutMrp = [
      { id: 'book-1', title: 'First Book', salePriceMinor: 900 },
      { id: 'book-2', title: 'Second Book', salePriceMinor: 1100 }
    ];

    const fetchPriceRecommendation = jest.fn().mockResolvedValue({
      recommendedPriceMinor: 3200,
      totalSalePriceMinor: 2000,
      totalMrpMinor: null
    });
    const formatPrice = jest
      .fn()
      .mockImplementation((valueInMinorUnits, currency) => `${currency} ${(valueInMinorUnits / 100).toFixed(2)}`);
    const announce = jest.fn();

    const { importError, mountError, api, adapters, elements } = await mountInlineBundleComposerHarness({
      adapters: { fetchPriceRecommendation, formatPrice, announce },
      bookFixtures: booksWithoutMrp,
      uiTexts: { totalMrpPlaceholder: 'Total MRP unavailable' }
    });

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    await addBooks(api, booksWithoutMrp);
    await flushMicrotasks();

    expect(elements.totalMrp.textContent).toContain('Total MRP unavailable');
    expect(elements.totalMrp.textContent).not.toMatch(/INR/);
    expect(adapters.announce).toHaveBeenCalled();
    const announceMessage = adapters.announce.mock.calls.pop()?.[0] || '';
    expect(announceMessage).toMatch(/unavailable/i);
  });
});
