import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F07-TP3-006: Lookup stays empty with helper copy before searching', () => {
  test('snapshot results do not render until the admin types a valid query', async () => {
    const harness = await createCustomerLookupHarness();

    harness.emitResults([
      {
        id: 'cust-1',
        name: 'Anil Rao',
        location: 'Bengaluru',
        whatsApp: '+91 99999 99999',
      },
    ]);

    expect(harness.rows).toHaveLength(0);
    expect(harness.emptyEl.hidden).toBe(false);
    expect(harness.emptyEl.textContent).toMatch(/start typing/i);

    harness.search('an');
    harness.emitResults([
      {
        id: 'cust-1',
        name: 'Anil Rao',
        location: 'Bengaluru',
        whatsApp: '+91 99999 99999',
      },
    ]);

    expect(harness.emptyEl.hidden).toBe(true);
    expect(harness.rows).toHaveLength(1);
  });
});
