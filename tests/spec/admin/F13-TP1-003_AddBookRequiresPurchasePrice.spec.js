import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

/**
 * SPEC F13-TP1-003: Purchase price field is required
 * Given the admin reaches the Add Book form
 * When they leave purchase price empty and submit
 * Then the book is not saved and an inline error references purchase price.
 */

describe('SPEC F13-TP1-003: Purchase price is required', () => {
  test('empty purchase price blocks submission and shows inline message', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('price', '325');
    harness.setField('mrp', '525');
    harness.setField('purchasePrice', '');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent.toLowerCase()).toContain('purchase');
    expect(harness.addMsg.textContent.toLowerCase()).toContain('required');
  });
});
