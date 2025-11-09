import { createAdminSupplierHarness } from '../../fixtures/adminSupplierHarness.js';

describe('SPEC F05-TP1-003: Persist supplier record', () => {
  test('valid submission calls addDoc with trimmed payload and resets form', async () => {
    const harness = await createAdminSupplierHarness();
    harness.setField('supplierName', '  Rare Finds  ');
    harness.setField('supplierLocation', '  Mumbai ');

    await harness.submit();

    expect(harness.mocks.addDoc).toHaveBeenCalledTimes(1);
    const payload = harness.mocks.addDoc.mock.calls[0]?.[1] || {};
    expect(payload.name).toBe('Rare Finds');
    expect(payload.location).toBe('Mumbai');
    expect(harness.form.elements['supplierName'].value).toBe('');
    expect(harness.form.elements['supplierLocation'].value).toBe('');
  });
});
