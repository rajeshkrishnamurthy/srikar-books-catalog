import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F08-TP2-004: Sale line totals allow duplicate book entries', () => {
  test('adding the same book twice tracks unique lines and updates totals', async () => {
    let seq = 0;
    const harness = await createSalesLineItemsHarness({
      buildLineId: () => {
        seq += 1;
        return `line-${seq}`;
      },
    });
    const book = {
      id: 'book-99',
      title: 'Firestorm Patterns',
      supplier: {
        id: 'sup-7',
        name: 'Evergreen Supply',
        location: 'Kochi',
      },
    };

    harness.selectBook(book);
    harness.typePrice('300');
    harness.submitLine();

    harness.selectBook(book);
    harness.typePrice('450.5');
    harness.submitLine();

    const rows = Array.from(harness.lineItemsBody.children);
    expect(rows).toHaveLength(2);
    expect(rows[0].dataset.lineId).toBe('line-1');
    expect(rows[1].dataset.lineId).toBe('line-2');
    expect(rows[0].dataset.bookId).toBe('book-99');
    expect(rows[1].dataset.bookId).toBe('book-99');
    expect(rows[0].dataset.bookId).toBe(rows[1].dataset.bookId);

    expect(harness.onLinesChange).toHaveBeenCalledTimes(2);
    const latestCall =
      harness.onLinesChange.mock.calls[harness.onLinesChange.mock.calls.length - 1];
    const latestPayload = (latestCall && latestCall[0]) || [];
    expect(Array.isArray(latestPayload)).toBe(true);
    expect(latestPayload).toHaveLength(2);
    const totalAmount = latestPayload.reduce((sum, line) => sum + (line.sellingPrice || 0), 0);
    expect(totalAmount).toBeCloseTo(750.5);
  });
});
