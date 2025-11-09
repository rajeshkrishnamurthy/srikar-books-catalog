import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('SPEC TP2-001: Edit form exposes purchase price field', () => {
  test('pre-fills purchase price input with stored value when opening edit dialog', async () => {
    const harness = await createAdminEditHarness();

    await harness.open('book-123', { purchasePrice: 455 });

    expect(harness.purchaseInput).not.toBeNull();
    expect(harness.purchaseInput.value).toBe('455');
    expect(harness.dialog.showModal).toHaveBeenCalled();
  });
});
