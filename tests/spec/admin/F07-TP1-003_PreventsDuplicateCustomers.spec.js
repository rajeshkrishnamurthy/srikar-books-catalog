import { jest } from '@jest/globals';
import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP1-003: Duplicate customers are rejected before writes', () => {
  test('WhatsApp digits + country code drive the duplicate query', async () => {
    const duplicateSnap = {
      docs: [{ id: 'cust-99', data: () => ({ countryCode: '+91' }) }],
      empty: false,
    };
    const getDocs = jest.fn(async () => duplicateSnap);
    const harness = await createAdminCustomerHarness({
      firebaseOverrides: { getDocs },
    });
    harness.setField('customerName', 'Asha Rao');
    harness.setField('customerAddress', '221B Baker Street');
    harness.setField('customerLocation', 'Chennai');
    harness.setField('customerWhatsApp', '+91 98765 43210');

    await harness.submit();

    expect(getDocs).toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toContain('duplicate');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    const whereCalls = harness.mocks.where.mock.calls;
    const digitsWhere = whereCalls.find(([field, , value]) => {
      return field === 'whatsAppDigits' && value === '9876543210';
    });
    const countryWhere = whereCalls.find(([field, , value]) => {
      return field === 'countryCode' && value === '+91';
    });
    expect(digitsWhere).toBeDefined();
    expect(countryWhere).toBeDefined();
  });
});
