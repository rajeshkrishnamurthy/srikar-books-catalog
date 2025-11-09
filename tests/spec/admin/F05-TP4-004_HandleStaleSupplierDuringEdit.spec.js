import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('SPEC F05-TP4-004: Handle stale supplier during edit', () => {
  test('if previously selected supplier disappears, save is blocked and warning shown', async () => {
    const harness = await createAdminEditHarness();
    harness.setSupplierOptions([
      { id: 'sup-1', name: 'Acme Books' },
      { id: 'sup-2', name: 'Zen Traders' },
    ]);

    await harness.open('book-1', { supplierId: 'sup-1' });

    harness.setSupplierOptions([{ id: 'sup-2', name: 'Zen Traders' }]);
    harness.supplierSelect.value = 'sup-1';

    await harness.submit();

    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toContain('supplier');
  });
});
