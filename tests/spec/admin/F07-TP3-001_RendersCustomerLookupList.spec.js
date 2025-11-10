import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F07-TP3-001: Customer lookup renders searchable list', () => {
  test('snapshot rows render sorted with highlighted query text and metadata', async () => {
    const harness = await createCustomerLookupHarness();
    expect(harness.mocks.onSnapshot).toHaveBeenCalled();

    harness.search('Anil');
    harness.emitResults([
      {
        id: 'cust-2',
        name: 'Zoya Malik',
        location: 'Mumbai',
        whatsApp: '+91 88888 00000',
        whatsAppDigits: '8888800000',
      },
      {
        id: 'cust-1',
        name: 'Anil Rao',
        location: 'Bengaluru',
        whatsApp: '+91 77777 11111',
        whatsAppDigits: '7777711111',
      },
    ]);

    const rows = harness.rows;
    expect(rows.length).toBe(2);
    expect(rows[0]?.dataset.customerId).toBe('cust-1');
    expect(rows[0]?.textContent ?? '').toContain('Anil Rao');
    expect(rows[0]?.textContent ?? '').toContain('Bengaluru');
    expect(rows[0]?.textContent ?? '').toContain('77777');
    const highlight = rows[0]?.querySelector('mark');
    expect(highlight?.textContent?.toLowerCase()).toBe('anil');
  });
});
