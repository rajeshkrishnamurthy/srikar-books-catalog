import { describe, expect, test } from '@jest/globals';
import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' };
const makeBook = (id, price) => ({ id, title: `Book ${id}`, price, supplier });

/**
 * SPEC F13-TP2-002: Clearing bundle price after recommendation blocks submission
 */

describe('SPEC F13-TP2-002: Clearing bundle price blocks submit', () => {
  test('clearing the price after it is suggested shows inline error and prevents save', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);
    harness.setSupplier('sup-1');
    harness.setTitle('Discount bundle');
    harness.emitBookSelection(makeBook('book-1', 250));
    harness.emitBookSelection(makeBook('book-2', 150));

    harness.setPrice('');
    expect(harness.priceError()).toMatch(/bundle price/i);
    expect(harness.submitDisabled()).toBe(true);

    await harness.submit();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });
});
