import { createSalesPersistHarness } from '../../fixtures/salesPersistHarness.js';

describe('SPEC F08-TP3-002: Persist sale document with header and lines', () => {
  test('combines header + lines and pushes a sale doc to Firestore', async () => {
    const harness = await createSalesPersistHarness({
      serverTimestamp: () => 'submitted-ts',
    });
    harness.setHeaderPayload({
      customerId: 'cust-7',
      customerSummary: { name: 'Vijay', location: 'Chennai' },
      saleDateIso: '2024-05-02',
      saleDateDisplay: '02-May-24',
    });
    harness.setLineItems([
      {
        lineId: 'line-1',
        bookId: 'book-11',
        bookTitle: 'Shapes of UI',
        sellingPrice: 450,
      },
      {
        lineId: 'line-2',
        bookId: 'book-99',
        bookTitle: 'Atomic Habits',
        sellingPrice: 500,
      },
    ]);

    await harness.submit();

    expect(harness.collection).toHaveBeenCalledWith(expect.any(Object), 'sales');
    expect(harness.addDoc).toHaveBeenCalledTimes(1);
    const payload = harness.addDoc.mock.calls[0][1];
    expect(payload.header.customerId).toBe('cust-7');
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lineId: 'line-1', bookId: 'book-11' }),
        expect.objectContaining({ lineId: 'line-2', sellingPrice: 500 }),
      ])
    );
    expect(payload.totals).toEqual({ count: 2, amount: 950 });
    expect(payload.submittedAt).toBe('submitted-ts');
    expect(payload.status).toBe('pending');
    expect(harness.msgEl.textContent.toLowerCase()).toContain('sale saved');
  });
});
