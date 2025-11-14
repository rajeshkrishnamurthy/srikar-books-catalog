import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' };

const book = (id, price) => ({
  id,
  title: `Title ${id}`,
  price,
  supplier,
});

describe('SPEC F12-TP1-004: Persist draft bundle payload', () => {
  test('valid submission stores supplier, bookIds, rupee price fields, and Draft status', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);
    harness.setSupplier('sup-1');
    harness.setTitle('Starter Kit');

    harness.emitBookSelection(book('book-1', 150));
    harness.emitBookSelection(book('book-2', 200));
    harness.setPrice('263');

    await harness.submit();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const [collectionRef, payload] = harness.mocks.addDoc.mock.calls[0];
    expect(collectionRef.path).toBe('bundles');

    expect(payload).toMatchObject({
      title: 'Starter Kit',
      supplierId: 'sup-1',
      supplierName: 'Lotus Books',
      supplierLocation: 'Chennai',
      bookIds: ['book-1', 'book-2'],
      status: 'Draft',
      createdBy: 'admin-1',
      bundlePriceRupees: 263,
      recommendedPriceRupees: 263,
      totalListPriceRupees: 350,
    });
    expect(payload.createdAt).toBe('ts');
  });
});
