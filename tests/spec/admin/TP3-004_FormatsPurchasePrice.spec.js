import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC TP3-004: Purchase price formatting', () => {
  test('applies rupee prefix and thousand separators', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitAvailableDocs([
      {
        id: 'book-format',
        title: 'Formatting 101',
        author: 'Formatter',
        category: 'Reference',
        binding: 'Paperback',
        purchasePrice: 12500,
      },
    ]);

    const text = harness.availList.textContent;
    expect(text).toContain('₹12,500');
  });
});
