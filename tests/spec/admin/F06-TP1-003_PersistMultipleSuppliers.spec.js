import { describe, expect, test } from '@jest/globals';
import { createAdminAddHarness } from '../../fixtures/adminAddHarness.js';

describe('SPEC F06-TP1-003: Persist multiple suppliers on add', () => {
  test('payload contains deduplicated supplierIds array', async () => {
    const harness = await createAdminAddHarness();
    harness.setSuppliers([
      { id: 'sup-legacy', name: 'Legacy Supplier' },
      { id: 'sup-1', name: 'Acme Books' },
      { id: 'sup-2', name: 'Zen Traders' },
    ]);
    harness.setField('supplierId', 'sup-legacy');
    harness.setSupplierIds(['sup-1', 'sup-2', 'sup-1']);

    await harness.submitAddForm();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const payload = harness.mocks.addDoc.mock.calls[0][1] || {};
    expect(payload.supplierIds).toEqual(['sup-1', 'sup-2']);
  });
});
