import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP1-002: Reject duplicate supplier names', () => {
  test('duplicate names (case-insensitive) are blocked with warning', async () => {
    const harness = await createAdminSupplierHarness();
    harness.emitSuppliers([
      { id: 'sup-1', name: 'Acme Books', location: 'Bengaluru' },
    ]);
    harness.setField('supplierName', '  acme books ');
    harness.setField('supplierLocation', 'Delhi');

    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('duplicate');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });
});
