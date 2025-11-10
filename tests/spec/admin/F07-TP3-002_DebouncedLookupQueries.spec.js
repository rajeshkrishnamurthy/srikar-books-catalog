import { jest } from '@jest/globals';
import { createCustomerLookupHarness } from '../../fixtures/customerLookupHarness.js';

describe('SPEC F07-TP3-002: Lookup debounces queries before hitting Firestore', () => {
  test('typing waits for debounce then queries with normalized keywords and limit', async () => {
    jest.useFakeTimers();
    const where = jest.fn((field, op, value) => ({ field, op, value }));
    const orderBy = jest.fn((field) => ({ field }));
    const limit = jest.fn((count) => ({ count }));
    const query = jest.fn((ref, ...constraints) => ({ ref, constraints }));
    const getDocs = jest.fn().mockResolvedValue({ docs: [], empty: true });
    const harness = await createCustomerLookupHarness({
      firebaseOverrides: { where, orderBy, limit, query, getDocs },
    });
    harness.search('  Anil  Rao ');
    jest.advanceTimersByTime(250);
    expect(getDocs).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(getDocs).toHaveBeenCalledTimes(1);

    const keywordCall = where.mock.calls.find(([field]) => field === 'keywords');
    expect(keywordCall?.[2]).toBe('anil rao');
    expect(limit).toHaveBeenCalledWith(20);
    jest.useRealTimers();
  });
});
