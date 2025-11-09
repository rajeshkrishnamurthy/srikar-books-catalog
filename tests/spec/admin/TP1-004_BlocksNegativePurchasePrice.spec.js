/*
SPEC TP1-004: Reject negative purchase price
Given an admin enters a negative purchase price
When they submit the add-book form
Then the submission is halted with a clear positive-number warning
*/

import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC TP1-004: Validation against negative purchase price', () => {
  test('stops the submission when the value is below zero', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('purchasePrice', '-50');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent).toMatch(/purchase price/i);
    expect(harness.addMsg.textContent).toMatch(/positive|zero/i);
  });
});
