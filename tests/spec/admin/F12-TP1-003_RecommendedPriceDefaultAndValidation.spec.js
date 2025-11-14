import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' };

const book = (id, price) => ({
  id,
  title: `Title ${id}`,
  price,
  supplier,
});

describe('SPEC F12-TP1-003: Recommended price + validation', () => {
  test('applies 25% discount recommendation and enforces min/max boundaries', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);
    harness.setSupplier('sup-1');
    harness.setTitle('Sci-fi combo');

    harness.emitBookSelection(book('book-1', 333));
    harness.emitBookSelection(book('book-2', 100));

    expect(harness.priceValue()).toBe('');
    expect(harness.submitDisabled()).toBe(true);
    expect(harness.recommendedHint.textContent).toMatch(/₹325/);

    harness.setPrice('500');
    expect(harness.priceError()).toMatch(/cannot exceed/i);
    expect(harness.submitDisabled()).toBe(true);

    harness.setPrice('0');
    expect(harness.priceError()).toMatch(/must be at least/i);
    expect(harness.submitDisabled()).toBe(true);

    harness.setPrice('250');
    expect(harness.priceError()).toBe('');
    expect(harness.submitDisabled()).toBe(false);
  });
});
