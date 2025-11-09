import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC TP3-002: Sold list also shows purchase price', () => {
  test('sold rows mirror the purchase price label', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitSoldDocs([
      {
        id: 'book-sold-1',
        title: 'Sold title',
        author: 'Writer',
        category: 'Non-Fiction',
        binding: 'Hardcover',
        purchasePrice: 820,
        price: 950,
        mrp: 1200,
        isbn: '9988776655',
      },
    ]);

    const text = harness.soldList.textContent;
    expect(text.toLowerCase()).toContain('purchase price:');
    expect(text).toContain('₹820');
  });
});
