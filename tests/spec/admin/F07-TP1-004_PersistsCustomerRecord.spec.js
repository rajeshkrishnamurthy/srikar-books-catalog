import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP1-004: Successful add persists normalized customer payload', () => {
  test('payload trims strings, normalizes WhatsApp, stores timestamps, and clears the form', async () => {
    const harness = await createAdminCustomerHarness();
    harness.setField('customerName', '  Lakshmi   Traders ');
    harness.setField('customerAddress', '  11 Market Road  ');
    harness.setField('customerLocation', '  Hyderabad ');
    harness.setField('customerWhatsApp', '  +91 98765 43210  ');

    await harness.submit();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const payload = harness.mocks.addDoc.mock.calls[0]?.[1] ?? {};
    expect(payload.name).toBe('Lakshmi Traders');
    expect(payload.address).toBe('11 Market Road');
    expect(payload.location).toBe('Hyderabad');
    expect(payload.whatsApp).toBe('9876543210');
    expect(payload.whatsAppDigits).toBe('9876543210');
    expect(payload.customerKey).toBe('+91#9876543210');
    expect(payload.createdAt).toBe('ts');
    expect(payload.updatedAt).toBe('ts');
    expect(harness.form.querySelector('#customerNameInput').value).toBe('');
    expect(harness.form.querySelector('#customerWhatsAppInput').value).toBe('');
    expect(harness.msgEl.textContent.toLowerCase()).toContain('customer added');
  });
});
