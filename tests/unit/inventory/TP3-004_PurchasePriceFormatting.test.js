import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('UNIT TP3-004: Purchase price formatting helper', () => {
  test('text uses ₹ prefix with comma separators', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitAvailableDocs([
      {
        id: 'unit-format-1',
        title: 'Format Book',
        author: 'Format Author',
        category: 'Finance',
        binding: 'Paperback',
        purchasePrice: 43210,
      },
    ]);

    const el = harness.availList.querySelector('.purchase-price');
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('₹43,210');
  });
});
