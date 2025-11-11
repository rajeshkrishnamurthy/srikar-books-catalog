import { buildSaleDocument } from '../../../scripts/admin/salesPersist.js';

describe('UNIT F08-TP3-001: buildSaleDocument helper', () => {
  test('produces a normalized sale document with totals and metadata', () => {
    const header = {
      customerId: 'cust-12',
      customerSummary: { name: 'Meera' },
      saleDateIso: '2024-05-06',
      saleDateDisplay: '06-May-24',
    };
    const lines = [
      { lineId: 'line-1', sellingPrice: 300, bookId: 'book-1', bookTitle: 'Systems' },
      { lineId: 'line-2', sellingPrice: 450, bookId: 'book-2', bookTitle: 'UX' },
    ];

    const doc = buildSaleDocument({
      header,
      lines,
      serverTimestamp: () => 'ts',
    });

    expect(doc.header).toEqual(header);
    expect(doc.lines).toEqual(lines);
    expect(doc.totals).toEqual({ count: 2, amount: 750 });
    expect(doc.submittedAt).toBe('ts');
    expect(doc.status).toBe('pending');
  });
});
