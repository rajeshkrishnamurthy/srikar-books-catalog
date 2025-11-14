import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F09-TP5-002: Selecting a new customer replaces the previous summary', () => {
  test('choosing another customer overwrites the hidden ID and summary text', async () => {
    const harness = await createSalesHeaderHarness();
    harness.selectCustomer({
      id: 'cust-2',
      name: 'Meera',
      location: 'Hyderabad',
      whatsApp: '+91 91234 56789',
    });
    expect(harness.customerIdInput.value).toBe('cust-2');
    expect(harness.customerSummary.dataset.empty).toBe('false');

    harness.selectCustomer({
      id: 'cust-8',
      name: 'Arnav',
      location: 'Mumbai',
      whatsApp: '+91 90000 11111',
    });

    expect(harness.customerIdInput.value).toBe('cust-8');
    expect(harness.customerSummary.textContent).toContain('Arnav');
    expect(harness.customerSummary.textContent).toContain('Mumbai');
    expect(harness.customerSummary.dataset.empty).toBe('false');
  });
});
