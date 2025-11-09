import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP1-001: Supplier form requires name/location', () => {
  test('missing name blocks submission and surfaces inline error', async () => {
    const harness = await createAdminSupplierHarness();
    harness.setField('supplierName', '');
    harness.setField('supplierLocation', 'Chennai');

    await harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('supplier name');
    expect(harness.mocks.addDoc).not.toHaveBeenCalled();
  });
});
