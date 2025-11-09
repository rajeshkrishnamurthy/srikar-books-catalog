import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC F05-TP3-004: Handle stale/invalid supplier selections', () => {
  test('Submitting with a stale supplier id is blocked and surfaces warning', async () => {
    const harness = await createAdminAddHarness();
    harness.setSuppliers([{ id: 'sup-live', name: 'Live Supplier', location: 'BLR' }]);
    harness.setField('supplierId', 'sup-stale');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent.toLowerCase()).toContain('supplier');
  });
});
