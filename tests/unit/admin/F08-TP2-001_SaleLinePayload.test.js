import { buildSaleLinePayload } from '../../../scripts/admin/salesLineItems.js';

describe('UNIT F08-TP2-001: Sale line payload helper', () => {
  test('normalizes book snapshot, supplier data, and timestamps', () => {
    const payload = buildSaleLinePayload({
      lineId: 'line-7',
      book: {
        id: 'book-42',
        title: '  Build With UI ',
      },
      supplier: {
        id: 'sup-3',
        name: '  Rare Reads  ',
        location: 'Delhi',
      },
      sellingPriceInput: '450.50',
      serverTimestamp: () => 'ts-9',
    });

    expect(payload).toMatchObject({
      lineId: 'line-7',
      bookId: 'book-42',
      bookTitle: 'Build With UI',
      supplier: {
        id: 'sup-3',
        name: 'Rare Reads',
        location: 'Delhi',
      },
      sellingPrice: 450.5,
      createdAt: 'ts-9',
      updatedAt: 'ts-9',
    });
  });
});
