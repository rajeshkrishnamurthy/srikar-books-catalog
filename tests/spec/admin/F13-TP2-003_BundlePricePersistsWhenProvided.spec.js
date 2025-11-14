import { describe, expect, test } from '@jest/globals';
import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplier = { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' };
const makeBook = (id, price) => ({ id, title: `Book ${id}`, price, supplier });

/**
 * SPEC F13-TP2-003: Entered bundle price allows submission and persists in payload
 */

describe('SPEC F13-TP2-003: Bundle price persists when provided', () => {
  test('typing a valid bundle price enables submit and persists bundlePriceRupees', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions([supplier]);
    harness.setSupplier('sup-1');
    harness.setTitle('Manual price bundle');
    harness.emitBookSelection(makeBook('book-1', 200));
    harness.emitBookSelection(makeBook('book-2', 300));

    harness.setPrice('350');
    expect(harness.submitDisabled()).toBe(false);

    await harness.submit();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const [, payload] = harness.mocks.addDoc.mock.calls[0];
    expect(payload.bundlePriceRupees).toBe(350);
  });
});
