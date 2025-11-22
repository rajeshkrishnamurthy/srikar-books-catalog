const {
  mountInlineBundleComposerHarness,
  addBooks,
  flushMicrotasks
} = require('../../fixtures/inlineBundleComposerHarness');

describe('SPEC SBD-F24-TP4-003: Total MRP is summed and announced', () => {
  test('Total MRP renders from selected book metadata and is announced via the adapter', async () => {
    const booksWithMrp = [
      { id: 'book-1', title: 'First Book', salePriceMinor: 1200, mrpMinor: 2400 },
      { id: 'book-2', title: 'Second Book', salePriceMinor: 1800, mrpMinor: 3100 }
    ];

    const fetchPriceRecommendation = jest.fn().mockResolvedValue({
      recommendedPriceMinor: 5200,
      totalSalePriceMinor: 3400,
      totalMrpMinor: 5500
    });
    const formatPrice = jest
      .fn()
      .mockImplementation((valueInMinorUnits, currency) => `${currency} ${(valueInMinorUnits / 100).toFixed(2)}`);
    const announce = jest.fn();

    const { importError, mountError, api, adapters, elements } = await mountInlineBundleComposerHarness({
      adapters: { fetchPriceRecommendation, formatPrice, announce },
      bookFixtures: booksWithMrp
    });

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    await addBooks(api, booksWithMrp);
    await flushMicrotasks();

    expect(adapters.formatPrice).toHaveBeenCalledWith(5500, 'INR');
    expect(elements.totalMrp.textContent).toContain('INR 55.00');
    expect(adapters.announce).toHaveBeenCalled();
    const announceMessage = adapters.announce.mock.calls.pop()?.[0] || '';
    expect(announceMessage).toMatch(/total mrp/i);
    expect(announceMessage).toMatch(/55\.00/);
  });
});
