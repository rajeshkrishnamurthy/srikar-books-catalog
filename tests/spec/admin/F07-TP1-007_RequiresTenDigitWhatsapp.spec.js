import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP1-007: WhatsApp number must be exactly 10 digits', () => {
  test('submission with fewer than 10 digits shows an inline error', async () => {
    const harness = await createAdminCustomerHarness();
    harness.setField('customerName', 'Metro Books');
    harness.setField('customerAddress', '12 Residency Road');
    harness.setField('customerLocation', 'Mumbai');
    harness.setField('customerWhatsApp', '123456789'); // 9 digits

    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('10-digit');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });

  test('submission with more than 10 digits is rejected instead of truncated', async () => {
    const harness = await createAdminCustomerHarness();
    harness.setField('customerName', 'City Library');
    harness.setField('customerAddress', '5 MG Road');
    harness.setField('customerLocation', 'Pune');
    harness.setField('customerWhatsApp', '123456789012'); // 12 digits

    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('10-digit');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });
});
