import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('SPEC TP2-003: Reject negative purchase price on edit', () => {
  test('prevents update when a negative purchase price is submitted', async () => {
    const harness = await createAdminEditHarness();
    await harness.open('book-77', { purchasePrice: 90 });

    harness.purchaseInput.value = '-45';
    await harness.submit();

    const message = harness.msgEl.textContent.toLowerCase();
    expect(message).toContain('purchase price');
    expect(message).toMatch(/positive|zero/);
    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
  });
});
