import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F09-TP2-003: Clear hints when the selection is removed', () => {
  test('reselecting null resets supplier + price hints to placeholders', async () => {
    const harness = await createSalesLineItemsHarness();
    harness.selectBook({
      id: 'book-9',
      title: 'Atomic Research',
      supplier: { id: 'sup-3', name: 'Book Bounty', location: 'Hyderabad' },
      history: { purchasePrice: 300, lastSellingPrice: 480 },
    });

    harness.selectBook(null);

    expect(harness.supplierHintEl.dataset.empty).toBe('true');
    expect(harness.supplierHintEl.textContent).toContain('Not set');
    expect(harness.purchaseHintEl.textContent).toContain('Not set');
    expect(harness.sellingHintEl.textContent).toContain('Not set');
  });
});
