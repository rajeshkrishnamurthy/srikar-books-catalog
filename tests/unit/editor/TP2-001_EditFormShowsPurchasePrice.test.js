import { createAdminEditHarness } from '../../fixtures/adminEditHarness.js';

describe('UNIT TP2-001: Edit form mirrors existing purchase price', () => {
  test('open() copies stored purchasePrice (including zero) into the field value', async () => {
    const harness = await createAdminEditHarness();

    await harness.open('book-unit-1', { purchasePrice: 0 });

    expect(harness.purchaseInput.value).toBe('0');
  });
});
