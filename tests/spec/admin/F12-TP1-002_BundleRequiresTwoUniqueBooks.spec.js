import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' };

const book = (id, price) => ({
  id,
  title: `Title ${id}`,
  price,
  supplier,
});

describe('SPEC F12-TP1-002: Require 2+ unique books + title before save', () => {
  test('submit stays disabled until supplier, title, and two unique books exist', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);

    harness.setSupplier('sup-1');
    harness.setTitle('');
    harness.emitBookSelection(book('book-1', 150));

    expect(harness.submitDisabled()).toBe(true);

    harness.setTitle('Starter Pack');
    expect(harness.submitDisabled()).toBe(true);

    harness.emitBookSelection(book('book-1', 150));
    expect(harness.selectedBookIds()).toEqual(['book-1']);
    expect(harness.submitDisabled()).toBe(true);

    harness.emitBookSelection(book('book-2', 200));
    expect(harness.selectedBookIds()).toEqual(['book-1', 'book-2']);
    expect(harness.submitDisabled()).toBe(true);

    harness.setPrice('300');
    expect(harness.submitDisabled()).toBe(false);
  });
});
