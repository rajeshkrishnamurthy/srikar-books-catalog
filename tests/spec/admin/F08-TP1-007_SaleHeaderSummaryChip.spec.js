import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F08-TP1-006: Sale header summary shows selected customer details', () => {
  test('selecting a customer surfaces name plus meta chip without extra controls', async () => {
    const harness = await createSalesHeaderHarness();

    harness.selectCustomer({
      id: 'cust-9',
      name: 'Anil Rao',
      location: 'Bengaluru',
      whatsApp: '+91 99999 88888',
    });

    const summary = harness.customerSummary;
    const nameEl = summary.querySelector('.customer-summary-name');
    const metaEl = summary.querySelector('.customer-summary-meta');
    expect(nameEl?.textContent).toContain('Anil Rao');
    expect(metaEl?.textContent).toContain('Bengaluru');
    expect(metaEl?.textContent).toContain('99999');
    expect(summary.dataset.empty).toBe('false');
    expect(summary.querySelector('button')).toBeNull();
  });
});
