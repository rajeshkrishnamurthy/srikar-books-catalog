import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC F05-TP3-003: Persist supplier reference on add', () => {
  test('Valid submission includes supplierId in the Firestore payload', async () => {
    const harness = await createAdminAddHarness();
    harness.setSuppliers([{ id: 'sup-77', name: 'Acme Books', location: 'BLR' }]);
    harness.setField('supplierId', 'sup-77');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const payload = harness.mocks.addDoc.mock.calls[0][1];
    expect(payload.supplierId).toBe('sup-77');
  });
});
