import { jest } from '@jest/globals';
import { buildCustomerEditPayload } from '../../../scripts/admin/customers.js';

describe('UNIT F07-TP2 edit payload helper', () => {
  test('normalizes inputs, preserves immutable fields, and refreshes keys', () => {
    const serverTimestamp = jest.fn(() => 'edit-stamp');
    const payload = buildCustomerEditPayload({
      existing: {
        id: 'cust-55',
        name: 'Original Name',
        address: 'Old address',
        location: 'Old town',
        whatsAppDigits: '7777700000',
        customerKey: '+91#7777700000',
        countryCode: '+91',
        createdAt: 'created-stamp',
      },
      updates: {
        name: '  New Name  ',
        address: '  44 MG Road ',
        location: '  Hyderabad ',
        whatsApp: ' +91 91234 56789 ',
      },
      serverTimestamp,
    });

    expect(payload).toMatchObject({
      name: 'New Name',
      address: '44 MG Road',
      location: 'Hyderabad',
      whatsApp: '9123456789',
      whatsAppDigits: '9123456789',
      countryCode: '+91',
      customerKey: '+91#9123456789',
      updatedAt: 'edit-stamp',
      createdAt: 'created-stamp',
    });
    expect(serverTimestamp).toHaveBeenCalledTimes(1);
  });
});
