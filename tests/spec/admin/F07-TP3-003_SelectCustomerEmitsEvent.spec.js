import { jest } from '@jest/globals';
import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F07-TP3-003: Selecting a lookup row emits structured payload', () => {
  test('clicking select button forwards customer details to onSelect callback', async () => {
    const onSelect = jest.fn();
    const harness = await createCustomerLookupHarness({ onSelect });

    harness.emitResults([
      {
        id: 'cust-9',
        name: 'Saanvi Menon',
        location: 'Hyderabad',
        whatsApp: '+91 91234 56789',
        whatsAppDigits: '9123456789',
      },
    ]);

    const selectBtn = harness.listEl.querySelector(
      'button[data-action="select"][data-customer-id="cust-9"]'
    );
    expect(selectBtn).toBeTruthy();
    selectBtn?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(onSelect).toHaveBeenCalledWith({
      id: 'cust-9',
      name: 'Saanvi Menon',
      location: 'Hyderabad',
      whatsApp: '+91 91234 56789',
      whatsAppDigits: '9123456789',
    });
  });
});
