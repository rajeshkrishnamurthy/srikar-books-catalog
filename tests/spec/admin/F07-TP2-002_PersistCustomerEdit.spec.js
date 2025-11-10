import { jest } from '@jest/globals';
import { createAdminCustomerHarness } from '../../fixtures/adminCustomerHarness.js';

describe('SPEC F07-TP2-002: Customer edits persist via updateDoc', () => {
  test('submitting in edit mode updates Firestore with normalized fields', async () => {
    const updateDoc = jest.fn().mockResolvedValue();
    const doc = jest.fn((db, path, id) => ({ db, path, id }));
    const harness = await createAdminCustomerHarness({
      firebaseOverrides: { updateDoc, doc },
    });

    harness.emitCustomers([
      {
        id: 'cust-7',
        name: 'Lakshmi Traders',
        address: '11 Market Road',
        location: 'Hyderabad',
        whatsApp: '+91 98765 43210',
        whatsAppDigits: '9876543210',
      },
    ]);

    const editButton = harness.listEl.querySelector(
      'button[data-action="edit"][data-customer-id="cust-7"]'
    );
    expect(editButton).toBeTruthy();
    editButton?.dispatchEvent(new Event('click', { bubbles: true }));
    await harness.flush();

    harness.setField('customerAddress', ' 44 MG Road ');
    harness.setField('customerWhatsApp', ' +91 99999 88888 ');
    await harness.submit();

    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'customers', 'cust-7');
    const payload = updateDoc.mock.calls[0]?.[1] ?? {};
    expect(payload).toMatchObject({
      name: 'Lakshmi Traders',
      address: '44 MG Road',
      location: 'Hyderabad',
      whatsApp: '9999988888',
      whatsAppDigits: '9999988888',
      customerKey: '+91#9999988888',
    });
    expect(payload.updatedAt).toBe('ts');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.form.dataset.mode).not.toBe('edit');
    expect(harness.form.querySelector('#customerIdInput').value).toBe('');
    expect(harness.msgEl.textContent.toLowerCase()).toContain('updated');
  });
});
