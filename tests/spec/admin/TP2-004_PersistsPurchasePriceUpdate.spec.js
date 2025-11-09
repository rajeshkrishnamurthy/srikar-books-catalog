import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('SPEC TP2-004: Persist edited purchase price', () => {
  test('sends numeric purchasePrice in the updateDoc payload when save succeeds', async () => {
    const harness = await createAdminEditHarness();
    await harness.open('book-88', { purchasePrice: 125 });

    harness.purchaseInput.value = '240';
    await harness.submit();

    expect(harness.mocks.updateDoc).toHaveBeenCalled();
    const call = harness.mocks.updateDoc.mock.calls[0];
    const patch = call?.[1] || {};
    expect(patch.purchasePrice).toBe(240);
    expect(typeof patch.purchasePrice).toBe('number');
    expect(harness.msgEl.textContent.toLowerCase()).toContain('saved');
  });
});
