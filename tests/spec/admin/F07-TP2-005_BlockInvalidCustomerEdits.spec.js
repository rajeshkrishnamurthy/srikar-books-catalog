import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP2-005: Edit validation mirrors add form rules', () => {
  test('edit mode still requires name and WhatsApp numbers before updateDoc runs', async () => {
    const harness = await createAdminCustomerHarness();
    harness.emitCustomers([
      {
        id: 'cust-8',
        name: 'Sanjay Verma',
        address: 'JP Nagar',
        location: 'Bengaluru',
        whatsApp: '+91 99999 00000',
        whatsAppDigits: '9999900000',
      },
    ]);

    const editButton = harness.listEl.querySelector(
      'button[data-action="edit"][data-customer-id="cust-8"]'
    );
    expect(editButton).toBeTruthy();
    editButton?.dispatchEvent(new Event('click', { bubbles: true }));
    await harness.flush();

    harness.setField('customerName', ' ');
    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('name');
    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();

    harness.setField('customerName', 'Sanjay Verma');
    harness.setField('customerWhatsApp', ' ');
    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('whatsapp');
    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
    expect(harness.form.dataset.mode).toBe('edit');
    expect(harness.form.querySelector('#customerIdInput').value).toBe('cust-8');
  });
});
