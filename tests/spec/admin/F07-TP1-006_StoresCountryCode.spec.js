import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP1-006: Customer payload stores country code independently', () => {
  test('submissions persist a dedicated countryCode field fixed to +91', async () => {
    const harness = await createAdminCustomerHarness();
    harness.setField('customerName', 'Global Books');
    harness.setField('customerAddress', '42 Cross Street');
    harness.setField('customerLocation', 'Chennai');
    harness.setField('customerWhatsApp', '  +91 98765 43210 ');

    await harness.submit();

    expect(harness.mocks.addDoc).toHaveBeenCalled();
    const payload = harness.mocks.addDoc.mock.calls[0]?.[1] ?? {};
    expect(payload.countryCode).toBe('+91');
    expect(payload.whatsApp).toBe('9876543210');
    expect(payload.whatsAppDigits).toBe('9876543210');
  });
});
