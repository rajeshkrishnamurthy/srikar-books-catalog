import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('UNIT TP3-001: Purchase price element exists for available rows', () => {
  test('available row contains .purchase-price element with rupee value', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitAvailableDocs([
      {
        id: 'unit-avail-1',
        title: 'Unit Book',
        author: 'Unit Author',
        category: 'Unit',
        binding: 'Paperback',
        purchasePrice: 650,
      },
    ]);

    const el = harness.availList.querySelector('.purchase-price');
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('₹650');
  });
});
