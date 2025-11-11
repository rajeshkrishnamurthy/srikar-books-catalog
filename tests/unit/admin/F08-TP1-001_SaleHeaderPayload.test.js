import { buildSaleHeaderPayload } from '../../../scripts/admin/salesHeader.js';

describe('UNIT F08-TP1: buildSaleHeaderPayload', () => {
  test('normalizes customer data, enforces UTC sale date, and stamps metadata', () => {
    const payload = buildSaleHeaderPayload({
      customer: {
        id: 'cust-2',
        name: '  Anil   Rao ',
        location: '  Bengaluru ',
      },
      saleDate: '10-Feb-24',
      serverTimestamp: () => 'ts',
    });

    expect(payload).toMatchObject({
      customerId: 'cust-2',
      customerSummary: {
        name: 'Anil Rao',
        location: 'Bengaluru',
      },
      saleDateDisplay: '10-Feb-24',
      saleDateIso: '2024-02-10',
      saleDateUtc: '2024-02-10T00:00:00.000Z',
      createdAt: 'ts',
      updatedAt: 'ts',
    });
  });
});
