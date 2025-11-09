import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('UNIT TP2-003: Prevent negative purchase price submissions', () => {
  test('negative numbers trigger an inline error and avoid updateDoc', async () => {
    const harness = await createAdminEditHarness();
    await harness.open('book-unit-3', { purchasePrice: 75 });

    harness.purchaseInput.value = '-5';
    await harness.submit();

    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toMatch(/positive|zero/);
  });
});
