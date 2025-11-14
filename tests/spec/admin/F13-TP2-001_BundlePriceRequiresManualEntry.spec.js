import { describe, expect, test } from '@jest/globals';
import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' };
const makeBook = (id, price) => ({ id, title: `Book ${id}`, price, supplier });

/**
 * SPEC F13-TP2-001: Bundle price must be entered manually before submit
 * Given an admin selects a supplier and qualifying books without touching the price field
 * When they attempt to submit immediately
 * Then the bundle should not save and the price input remains empty/pending confirmation.
 */

describe('SPEC F13-TP2-001: Bundle price requires manual entry', () => {
  test('auto-recommended price is not enough—admin must enter a value before submit', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);
    harness.setSupplier('sup-1');
    harness.setTitle('Starter combo');
    harness.emitBookSelection(makeBook('book-1', 200));
    harness.emitBookSelection(makeBook('book-2', 300));

    await harness.submit();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.priceValue()).toBe('');
    expect(harness.submitDisabled()).toBe(true);
  });
});
