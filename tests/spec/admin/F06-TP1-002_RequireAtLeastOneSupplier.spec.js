import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC F06-TP1-002: Require at least one supplier on add', () => {
  test('submitting with zero suppliers selected blocks submission', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('supplierId', 'sup-legacy'); // legacy single-select fallback
    harness.setSupplierIds([]); // no multi selections

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent.toLowerCase()).toContain('supplier');
  });
});
