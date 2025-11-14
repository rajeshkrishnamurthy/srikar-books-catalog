import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

/**
 * SPEC F13-TP1-002: Book MRP field is required
 * Given the admin fills the Add Book form
 * When they leave MRP empty and submit
 * Then the form shows an inline error and prevents persistence.
 */

describe('SPEC F13-TP1-002: Book MRP is required', () => {
  test('empty MRP prevents addDoc and surfaces inline guidance', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('price', '325');
    harness.setField('mrp', '');
    harness.setField('purchasePrice', '180');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent.toLowerCase()).toContain('mrp');
    expect(harness.addMsg.textContent.toLowerCase()).toContain('required');
  });
});
