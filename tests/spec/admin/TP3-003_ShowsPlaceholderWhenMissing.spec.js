import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC TP3-003: Placeholder when purchase price missing', () => {
  test('renders “Purchase price: not set” when value absent', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitAvailableDocs([
      {
        id: 'book-no-price',
        title: 'Mystery',
        author: 'Unknown',
        category: 'Fiction',
        binding: 'Paperback',
        price: 300,
        mrp: 550,
      },
    ]);

    const text = harness.availList.textContent.toLowerCase();
    expect(text).toContain('purchase price: not set');
  });
});
