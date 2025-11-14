import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F15-TP3-001: Hash deep link activates target panel', () => {
  test('#bundles opens the Bundles panel and marks the nav tile active', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#bundles' });
    try {
      await harness.simulateSignIn();

      const bundlesButton = harness.bundlesNavButton;
      expect(bundlesButton).not.toBeNull();
      expect(bundlesButton.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#bundles');

      const bundlesPanel = document.getElementById('bundlesPanel');
      expect(bundlesPanel).not.toBeNull();
      expect(bundlesPanel.hidden).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
