import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F08-TP1-003: Sale header emits normalized payload when valid', () => {
  test('valid customer + date triggers onHeaderReady with UTC timestamp and metadata', async () => {
    const harness = await createSalesHeaderHarness();
    harness.selectCustomer({
      id: 'cust-5',
      name: 'Zoya Malik',
      location: 'Mumbai',
    });
    harness.setSaleDate('10-Feb-24');

    harness.submit();

    expect(harness.onHeaderReady).toHaveBeenCalledTimes(1);
    const payload = harness.onHeaderReady.mock.calls[0]?.[0] ?? {};
    expect(payload.customerId).toBe('cust-5');
    expect(payload.customerSummary).toMatchObject({
      name: 'Zoya Malik',
      location: 'Mumbai',
    });
    expect(payload.saleDateDisplay).toBe('10-Feb-24');
    expect(payload.saleDateIso).toBe('2024-02-10');
    expect(payload.saleDateUtc).toBe('2024-02-10T00:00:00.000Z');
    expect(payload.createdAt).toBe('ts');
  });
});
