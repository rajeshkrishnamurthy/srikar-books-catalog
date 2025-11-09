import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('UNIT TP3-002: Sold rows keep purchase price element', () => {
  test('sold list row includes .purchase-price with rupee amount', async () => {
    const harness = await createAdminInventoryHarness();

    harness.emitSoldDocs([
      {
        id: 'unit-sold-1',
        title: 'Sold Unit Book',
        author: 'Someone',
        category: 'History',
        binding: 'Hardcover',
        purchasePrice: 920,
      },
    ]);

    const el = harness.soldList.querySelector('.purchase-price');
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('₹920');
  });
});
