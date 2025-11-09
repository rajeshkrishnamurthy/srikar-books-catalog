import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('SPEC F05-TP4-003: Require valid supplier when saving edits', () => {
  test('empty supplier selection blocks save with inline message', async () => {
    const harness = await createAdminEditHarness();
    harness.setSupplierOptions([{ id: 'sup-1', name: 'Acme Books' }]);

    await harness.open('book-1', { supplierId: 'sup-1' });
    harness.supplierSelect.value = '';

    await harness.submit();

    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toContain('supplier');
  });
});
