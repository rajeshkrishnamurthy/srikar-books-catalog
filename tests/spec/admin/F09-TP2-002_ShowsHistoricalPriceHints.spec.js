import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F09-TP2-002: Show historical purchase and selling price hints', () => {
  test('price hint labels show currency-formatted amounts when history is available', async () => {
    const harness = await createSalesLineItemsHarness({
      formatCurrency: (amount) => `₹${Number(amount || 0).toFixed(2)}`,
    });
    const book = {
      id: 'book-81',
      title: 'Practical Typography',
      supplier: { id: 'sup-1', name: 'Rare Reads', location: 'Delhi' },
      history: {
        lastSellingPrice: 650,
        purchasePrice: 420,
      },
    };

    harness.selectBook(book);

    expect(harness.purchaseHintEl.textContent).toContain('₹420');
    expect(harness.purchaseHintEl.dataset.empty).toBe('false');
    expect(harness.sellingHintEl.textContent).toContain('₹650');
    expect(harness.sellingHintEl.textContent.toLowerCase()).toContain('last sold');
  });
});
