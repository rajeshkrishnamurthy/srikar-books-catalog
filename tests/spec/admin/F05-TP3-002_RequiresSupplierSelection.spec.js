import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC F05-TP3-002: Supplier selection is required', () => {
  test('Submitting without a supplier prevents addDoc and shows inline error', async () => {
    const harness = await createAdminAddHarness();
    harness.setSuppliers([{ id: 'sup-1', name: 'Rare Finds', location: 'Pune' }]);
    harness.setField('supplierId', '');

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
    expect(harness.addMsg.textContent.toLowerCase()).toContain('supplier');
  });
});
