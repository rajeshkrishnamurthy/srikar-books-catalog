/*
SPEC TP1-002: Persist purchase price in Firestore
Given an admin enters a numeric purchase price while adding a book
When the form submission succeeds
Then the Firestore payload stores that number as purchasePrice
*/

import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC TP1-002: Persist purchase price', () => {
  test('includes purchasePrice number in the addDoc payload', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('purchasePrice', '175');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const [, payload] = harness.mocks.addDoc.mock.calls[0];
    expect(payload.purchasePrice).toBe(175);
    expect(typeof payload.purchasePrice).toBe('number');
  });
});
