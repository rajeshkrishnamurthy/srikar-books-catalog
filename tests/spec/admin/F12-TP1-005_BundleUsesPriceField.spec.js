import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' };

const bookWithPriceField = (id, priceValue) => ({
  id,
  title: `Title ${id}`,
  Price: priceValue,
  supplier,
});

describe('SPEC F12-TP1-005: Bundle uses Price field for totals', () => {
  test('derives totals and recommended price from the Price field even when price property is missing', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);
    harness.setSupplier('sup-1');
    harness.setTitle('Price field bundle');

    harness.emitBookSelection(bookWithPriceField('book-1', '400'));
    harness.emitBookSelection(bookWithPriceField('book-2', 250));

    expect(harness.recommendedHint.textContent).toMatch(/₹488/); // (400 + 250) * 0.75 = 487.5 -> 488
    expect(harness.priceValue()).toBe('');
    expect(harness.submitDisabled()).toBe(true);

    harness.setPrice('488');
    expect(harness.submitDisabled()).toBe(false);
  });
});
