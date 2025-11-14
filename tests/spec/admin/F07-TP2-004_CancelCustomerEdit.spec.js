import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP2-004: Cancel clears edit mode', () => {
  test('cancel button exits edit mode, clears hidden id, and restores blank form', async () => {
    const harness = await createAdminCustomerHarness();
    harness.emitCustomers([
      {
        id: 'cust-4',
        name: 'Ravi Kumar',
        address: '221B Baker Street',
        location: 'Chennai',
        whatsApp: '+91 66666 44444',
        whatsAppDigits: '6666644444',
      },
    ]);

    const editButton = harness.listEl.querySelector(
      'button[data-action="edit"][data-customer-id="cust-4"]'
    );
    expect(editButton).toBeTruthy();
    editButton?.dispatchEvent(new Event('click', { bubbles: true }));
    await harness.flush();

    harness.cancelBtn.click();
    await harness.flush();

    expect(harness.form.dataset.mode).not.toBe('edit');
    expect(harness.form.querySelector('#customerIdInput').value).toBe('');
    expect(harness.form.querySelector('#customerNameInput').value).toBe('');
    expect(harness.form.querySelector('#customerAddressInput').value).toBe('');
    expect(harness.form.querySelector('#customerLocationInput').value).toBe('');
    expect(harness.form.querySelector('#customerWhatsAppInput').value).toBe('');
    expect(harness.msgEl.textContent.toLowerCase()).not.toContain('editing');
  });
});
