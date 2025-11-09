import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC F06-TP1-004: Handle stale supplier selections', () => {
  test('stale supplier selections prevent submission and reset', async () => {
    const harness = await createAdminAddHarness();
    harness.setField('supplierId', 'sup-legacy');
    harness.setSupplierIds(['sup-stale']);

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent.toLowerCase()).toContain('supplier');
  });
});
