import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F08-TP2-003: Sale line adds row with supplier snapshot', () => {
  test('valid book + price appends row and notifies consumer with normalized payload', async () => {
    const harness = await createSalesLineItemsHarness({
      buildLineId: () => 'line-1',
    });
    const book = {
      id: 'book-31',
      title: 'Inclusive Design Systems',
      supplier: {
        id: 'sup-11',
        name: 'Design Depot',
        location: 'Chennai',
      },
    };

    harness.selectBook(book);
    harness.typePrice('450');
    harness.submitLine();

    expect(harness.lineItemsBody.children).toHaveLength(1);
    const row = harness.lineItemsBody.children[0];
    expect(row.dataset.lineId).toBe('line-1');
    expect(row.dataset.bookId).toBe('book-31');
    expect(row.dataset.supplierId).toBe('sup-11');
    expect(row.textContent).toContain('Inclusive Design Systems');
    expect(row.textContent).toContain('Design Depot');
    expect(harness.onLinesChange).toHaveBeenCalledTimes(1);
    const payload = harness.onLinesChange.mock.calls[0][0];
    const lines = Array.isArray(payload) ? payload : [];
    expect(Array.isArray(payload)).toBe(true);
    const firstLine = lines[0] || {};
    expect(firstLine).toMatchObject({
      lineId: 'line-1',
      bookId: 'book-31',
      bookTitle: 'Inclusive Design Systems',
      supplier: {
        id: 'sup-11',
        name: 'Design Depot',
        location: 'Chennai',
      },
      sellingPrice: 450,
    });
    expect(harness.bookIdInput.value).toBe('');
    expect(harness.selectedBookSummary.dataset.empty).toBe('true');
  });
});
