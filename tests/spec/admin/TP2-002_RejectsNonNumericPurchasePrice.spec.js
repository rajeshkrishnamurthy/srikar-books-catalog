import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('SPEC TP2-002: Reject non-numeric purchase price on edit', () => {
  test('blocks save and surfaces numeric guidance when value contains letters', async () => {
    const harness = await createAdminEditHarness();
    await harness.open('book-55', { purchasePrice: 200 });

    harness.purchaseInput.value = 'abc123';
    await harness.submit();

    const message = harness.msgEl.textContent.toLowerCase();
    expect(message).toContain('purchase price');
    expect(message).toContain('numeric');
    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
  });
});
