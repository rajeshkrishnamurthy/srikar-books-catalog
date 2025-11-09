import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('UNIT TP2-004: Persist purchase price edits to Firestore', () => {
  test('updateDoc receives purchasePrice as a number when submission passes validation', async () => {
    const harness = await createAdminEditHarness();
    await harness.open('book-unit-4', { purchasePrice: 150 });

    harness.purchaseInput.value = '360';
    await harness.submit();

    expect(harness.mocks.updateDoc).toHaveBeenCalled();
    const [, patch] = harness.mocks.updateDoc.mock.calls[0] || [];
    expect(patch.purchasePrice).toBe(360);
    expect(typeof patch.purchasePrice).toBe('number');
  });
});
