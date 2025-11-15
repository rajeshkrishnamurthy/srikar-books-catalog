import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP1-001: Bundles nav is renamed and visible', () => {
  test('Bundles nav button label reads "Bundles"', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bundlesButton = harness.bundlesNavButton;
      expect(bundlesButton).not.toBeNull();

      const label = bundlesButton?.textContent?.replace(/\s+/g, ' ').trim();
      expect(label).toContain('Bundles');
      expect(label).not.toContain('Create bundles');
    } finally {
      harness.cleanup();
    }
  });
});
