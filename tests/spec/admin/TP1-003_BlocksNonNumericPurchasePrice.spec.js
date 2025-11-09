/*
SPEC TP1-003: Reject non-numeric purchase price
Given an admin types a non-numeric purchase price
When they submit the add-book form
Then submission is blocked with a helpful message and no Firestore write occurs
*/

import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC TP1-003: Validation against non-numeric input', () => {
  test('prevents addDoc and surfaces an inline error', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('purchasePrice', 'abc123');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent).toMatch(/purchase price/i);
    expect(harness.addMsg.textContent).toMatch(/number|numeric/i);
  });
});
