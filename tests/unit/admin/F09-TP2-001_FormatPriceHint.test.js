import { formatPriceHint } from '../../../scripts/admin/salesLineHints.js';

describe('UNIT F09-TP2-001: formatPriceHint helper', () => {
  test('formats rupee amounts with labels and defaults to Not set', () => {
    expect(
      formatPriceHint({
        label: 'Last sold',
        amount: 540,
        currency: '₹',
      })
    ).toBe('Last sold: ₹540');

    expect(
      formatPriceHint({
        label: 'Purchase price',
        amount: null,
      })
    ).toBe('Purchase price: Not set');
  });
});
