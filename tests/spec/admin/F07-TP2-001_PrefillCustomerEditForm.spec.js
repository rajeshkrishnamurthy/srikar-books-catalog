import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP2-001: Edit button pre-fills the customer form', () => {
  test('clicking edit switches the form to edit mode with populated fields', async () => {
    const harness = await createAdminCustomerHarness();
    harness.emitCustomers([
      {
        id: 'cust-1',
        name: 'Anil Rao',
        address: '11 Residency Road',
        location: 'Bengaluru',
        whatsApp: '+91 99999 88888',
        whatsAppDigits: '9999988888',
      },
    ]);

    const editButton = harness.listEl.querySelector(
      'button[data-action="edit"][data-customer-id="cust-1"]'
    );
    expect(editButton).toBeTruthy();

    editButton?.dispatchEvent(new Event('click', { bubbles: true }));
    await harness.flush();

    expect(harness.form.dataset.mode).toBe('edit');
    expect(harness.form.querySelector('#customerIdInput').value).toBe('cust-1');
    expect(harness.form.querySelector('#customerNameInput').value).toBe('Anil Rao');
    expect(harness.form.querySelector('#customerAddressInput').value).toBe(
      '11 Residency Road'
    );
    expect(harness.form.querySelector('#customerLocationInput').value).toBe(
      'Bengaluru'
    );
    expect(harness.form.querySelector('#customerWhatsAppInput').value).toBe(
      '+91 99999 88888'
    );
    expect(harness.msgEl.textContent.toLowerCase()).toContain('editing');
  });
});
