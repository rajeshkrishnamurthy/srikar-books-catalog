import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP2-001: Inline edit pre-fills supplier', () => {
  test('clicking edit populates the form with supplier values and sets edit mode', async () => {
    const harness = await createAdminSupplierHarness();
    harness.emitSuppliers([
      { id: 'sup-1', name: 'Acme Books', location: 'Bengaluru' },
      { id: 'sup-2', name: 'Zen Traders', location: 'Hyderabad' },
    ]);

    await harness.clickListButton(0, 'edit');

    expect(harness.form.dataset.mode).toBe('edit');
    expect(harness.form.elements['supplierId'].value).toBe('sup-1');
    expect(harness.form.elements['supplierName'].value).toBe('Acme Books');
    expect(harness.form.elements['supplierLocation'].value).toBe('Bengaluru');
  });

  test('cancel button exits edit mode and clears hidden id', async () => {
    const harness = await createAdminSupplierHarness();
    harness.emitSuppliers([{ id: 'sup-3', name: 'Nova House', location: 'Mumbai' }]);

    await harness.clickListButton(0, 'edit');
    harness.form.querySelector('#supplierCancelBtn').click();

    expect(harness.form.dataset.mode).not.toBe('edit');
    expect(harness.form.elements['supplierId'].value).toBe('');
  });
});
