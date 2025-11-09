import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('SPEC F05-TP4-002: Persist supplier change from edit dialog', () => {
  test('submitting edit with a different supplier updates Firestore payload', async () => {
    const harness = await createAdminEditHarness();
    harness.setSupplierOptions([
      { id: 'sup-1', name: 'Acme Books' },
      { id: 'sup-2', name: 'Zen Traders' },
    ]);

    await harness.open('book-1', { supplierId: 'sup-1' });
    harness.supplierSelect.value = 'sup-2';
    await harness.submit();

    expect(harness.mocks.updateDoc).toHaveBeenCalledTimes(1);
    const payload = harness.mocks.updateDoc.mock.calls[0][1] || {};
    expect(payload.supplierId).toBe('sup-2');
  });
});
