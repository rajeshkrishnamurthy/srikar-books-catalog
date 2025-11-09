import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC TP3-001: Available list shows purchase price', () => {
  test('renders purchase price text with rupee value for available rows', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitAvailableDocs([
      {
        id: 'book-avail-1',
        title: 'Test Title',
        author: 'Author',
        category: 'Fiction',
        binding: 'Paperback',
        purchasePrice: 650,
        price: 799,
        mrp: 999,
        isbn: '1234567890',
      },
    ]);

    const text = harness.availList.textContent;
    expect(text.toLowerCase()).toContain('purchase price:');
    expect(text).toContain('₹650');
  });
});
