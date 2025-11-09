import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('UNIT TP2-002: Validate numeric purchase price on edit save', () => {
  test('non-numeric input keeps dialog open and skips updateDoc', async () => {
    const harness = await createAdminEditHarness();
    await harness.open('book-unit-2', { purchasePrice: 310 });

    harness.purchaseInput.value = '12seven';
    await harness.submit();

    expect(harness.dialog.close).not.toHaveBeenCalled();
    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toMatch(/numeric/);
  });
});
