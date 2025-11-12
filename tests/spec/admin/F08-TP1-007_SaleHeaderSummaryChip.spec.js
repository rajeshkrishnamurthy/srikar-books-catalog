import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F08-TP1-006: Sale header summary shows selected customer details', () => {
  test('selecting a customer surfaces name, WhatsApp, location, and a Change customer control', async () => {
    const harness = await createSalesHeaderHarness();

    harness.selectCustomer({
      id: 'cust-9',
      name: 'Anil Rao',
      location: 'Bengaluru',
      whatsApp: '+91 99999 88888',
    });

    const summary = harness.customerSummary;
    expect(summary.textContent).toContain('Anil Rao');
    expect(summary.textContent).toContain('Bengaluru');
    expect(summary.textContent).toContain('99999');
    expect(summary.dataset.empty).toBe('false');
    const changeBtn = summary.querySelector('button');
    expect(changeBtn).not.toBeNull();
    expect(changeBtn?.textContent).toMatch(/Change customer/i);
  });
});
