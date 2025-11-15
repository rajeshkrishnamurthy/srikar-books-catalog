import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP2-001: Sale nav is renamed and ready for sub nav', () => {
  test('Nav button label reads "Sale"', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const saleButton = harness.recordSaleNavButton;
      expect(saleButton).not.toBeNull();

      const label = saleButton?.textContent?.replace(/\s+/g, ' ').trim();
      expect(label).toContain('Sale');
    } finally {
      harness.cleanup();
    }
  });
});
