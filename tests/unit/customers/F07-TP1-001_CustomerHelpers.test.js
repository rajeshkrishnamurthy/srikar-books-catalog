import { jest } from '@jest/globals';
import {
  normalizeCustomerName,
  normalizeCustomerAddress,
  normalizeCustomerLocation,
  sanitizeWhatsAppNumber,
  makeCustomerKey,
  buildCustomerPayload,
} from '../../../scripts/admin/customers.js';

describe('UNIT F07-TP1 customer helper functions', () => {
  test('normalize helpers trim input and collapse whitespace', () => {
    expect(normalizeCustomerName('  Asha   Rao  ')).toBe('Asha Rao');
    expect(normalizeCustomerAddress('  11, Residency Road  ')).toBe(
      '11, Residency Road'
    );
    expect(normalizeCustomerLocation('  Bengaluru  ')).toBe('Bengaluru');
  });

  test('sanitizeWhatsAppNumber strips separators and country code so only digits remain', () => {
    expect(sanitizeWhatsAppNumber(' +91 98-765 43210 ')).toBe('9876543210');
    expect(makeCustomerKey('+91', '9876543210')).toBe('+91#9876543210');
  });

  test('buildCustomerPayload normalizes inputs, stores digits, and timestamps the record', () => {
    const serverTimestamp = jest.fn(() => 'stamp');
    const payload = buildCustomerPayload({
      name: '  Lakshmi   Traders ',
      address: '\n  Door 11, Market Road ',
      location: '  Hyderabad ',
      whatsApp: ' +91 98765 43210 ',
      serverTimestamp,
    });
    expect(payload).toMatchObject({
      name: 'Lakshmi Traders',
      address: 'Door 11, Market Road',
      location: 'Hyderabad',
      whatsApp: '9876543210',
      whatsAppDigits: '9876543210',
      countryCode: '+91',
      customerKey: '+91#9876543210',
      createdAt: 'stamp',
      updatedAt: 'stamp',
    });
    expect(serverTimestamp).toHaveBeenCalledTimes(2);
  });
});
