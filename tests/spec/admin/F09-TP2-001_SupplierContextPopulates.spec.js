import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F09-TP2-001: Supplier context populates immediately after title selection', () => {
  test('selectBook updates the supplier hint panel with name and location', async () => {
    const harness = await createSalesLineItemsHarness();
    const book = {
      id: 'book-55',
      title: 'Systems Thinking',
      supplier: {
        id: 'sup-99',
        name: 'Design Depot',
        location: 'Chennai',
      },
    };

    harness.selectBook(book);

    expect(harness.supplierHintEl.textContent).toContain('Design Depot');
    expect(harness.supplierHintEl.textContent).toContain('Chennai');
    expect(harness.supplierHintEl.dataset.empty).toBe('false');
  });
});
