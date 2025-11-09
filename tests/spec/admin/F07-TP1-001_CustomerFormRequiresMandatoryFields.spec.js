import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP1-001: Customer form enforces required fields', () => {
  test('missing customer name blocks submission with inline guidance', async () => {
    const harness = await createAdminCustomerHarness();
    harness.setField('customerName', '');
    harness.setField('customerAddress', '45 Residency Road');
    harness.setField('customerLocation', 'Bengaluru');
    harness.setField('customerWhatsApp', '+91 98765 43210');

    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('name');
    expect(harness.msgEl.textContent.toLowerCase()).toContain('required');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });

  test('missing WhatsApp number blocks submission as well', async () => {
    const harness = await createAdminCustomerHarness();
    harness.setField('customerName', 'Asha Rao');
    harness.setField('customerAddress', '11 Residency Road');
    harness.setField('customerLocation', 'Bengaluru');
    harness.setField('customerWhatsApp', '');

    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('whatsapp');
    expect(harness.msgEl.textContent.toLowerCase()).toContain('required');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });
});
