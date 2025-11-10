import { jest } from '@jest/globals';
import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP2-003: Duplicate edits are blocked', () => {
  test('editing to a duplicate WhatsApp + country code combination surfaces an error', async () => {
    const duplicateSnap = {
      docs: [{ id: 'cust-99', data: () => ({ countryCode: '+91' }) }],
      empty: false,
    };
    const getDocs = jest.fn(async () => duplicateSnap);
    const harness = await createAdminCustomerHarness({
      firebaseOverrides: { getDocs },
    });

    harness.emitCustomers([
      {
        id: 'cust-3',
        name: 'Zoya Malik',
        address: '90 Brigade Road',
        location: 'Bengaluru',
        whatsApp: '+91 77777 55555',
        whatsAppDigits: '7777755555',
      },
    ]);

    const editButton = harness.listEl.querySelector(
      'button[data-action="edit"][data-customer-id="cust-3"]'
    );
    expect(editButton).toBeTruthy();
    editButton?.dispatchEvent(new Event('click', { bubbles: true }));
    await harness.flush();

    harness.setField('customerWhatsApp', '+91 77777 55555');
    await harness.submit();

    expect(getDocs).toHaveBeenCalled();
    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toContain('duplicate');
    expect(harness.form.dataset.mode).toBe('edit');

    const whereCalls = harness.mocks.where.mock.calls;
    const digitsWhere = whereCalls.find(([field, , value]) => {
      return field === 'whatsAppDigits' && value === '7777755555';
    });
    const countryWhere = whereCalls.find(([field, , value]) => {
      return field === 'countryCode' && value === '+91';
    });
    expect(digitsWhere).toBeDefined();
    expect(countryWhere).toBeDefined();
  });
});
