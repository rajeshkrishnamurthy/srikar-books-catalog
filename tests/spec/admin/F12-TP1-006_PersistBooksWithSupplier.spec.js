import { describe, expect, test } from '@jest/globals';
import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-2', name: 'Paper Trail', location: 'Hyderabad' };

const book = (id, price) => ({
  id,
  title: `Bundle Pick ${id}`,
  price,
  supplier,
  supplierId: supplier.id,
});

describe('SPEC F12-TP1-006: Persist embedded book metadata', () => {
  test('book entries include id, title, price, and supplierId in the payload', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);
    harness.setSupplier('sup-2');
    harness.setTitle('Paper Trail Starter');

    harness.emitBookSelection(book('book-10', 400));
    harness.emitBookSelection(book('book-11', 250));
    harness.setPrice('488');

    await harness.submit();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const [, payload] = harness.mocks.addDoc.mock.calls[0];
    expect(payload.books).toEqual([
      { id: 'book-10', title: 'Bundle Pick book-10', price: 400, supplierId: 'sup-2' },
      { id: 'book-11', title: 'Bundle Pick book-11', price: 250, supplierId: 'sup-2' },
    ]);
  });
});
