import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

/**
 * SPEC F13-TP1-001: Book price field is required
 * Given the admin opens the Add Book form
 * When they clear the selling price field and submit
 * Then the submission is blocked, addDoc is never called, and an inline error mentions price.
 */

describe('SPEC F13-TP1-001: Book price is required', () => {
  test('empty price blocks submission with inline feedback', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('price', '');
    harness.setField('mrp', '499');
    harness.setField('purchasePrice', '175');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent.toLowerCase()).toContain('price');
    expect(harness.addMsg.textContent.toLowerCase()).toContain('required');
  });
});
