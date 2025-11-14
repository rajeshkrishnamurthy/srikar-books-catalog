import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F08-TP2-001: Sale line draft reflects selected book metadata', () => {
  test('book lookup selection populates summary and hidden inputs', async () => {
    const harness = await createSalesLineItemsHarness();
    harness.selectBook({
      id: 'book-17',
      title: 'The Pragmatic Seller',
      supplier: {
        id: 'sup-4',
        name: 'Yellow Brick Distributors',
        location: 'Bengaluru',
      },
      purchasePrice: 175,
    });

    expect(harness.bookIdInput.value).toBe('book-17');
    expect(harness.selectedBookSummary.dataset.empty).toBe('false');
    expect(harness.selectedBookSummary.textContent).toContain('Pragmatic Seller');
    expect(harness.selectedBookSummary.textContent).toContain('Yellow Brick Distributors');
    expect(harness.addLineBtn.disabled).toBe(true);
    expect(harness.msgEl.textContent).toBe('');
  });
});
