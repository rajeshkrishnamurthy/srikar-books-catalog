import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP1-002: WhatsApp numbers must be valid and normalized', () => {
  test('non-numeric characters produce an inline WhatsApp validation error', async () => {
    const harness = await createAdminCustomerHarness();
    harness.setField('customerName', 'Divya Prasad');
    harness.setField('customerAddress', '17 Park Street');
    harness.setField('customerLocation', 'Hyderabad');
    harness.setField('customerWhatsApp', 'abc-123-whatsapp');

    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('valid whatsapp');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });
});
