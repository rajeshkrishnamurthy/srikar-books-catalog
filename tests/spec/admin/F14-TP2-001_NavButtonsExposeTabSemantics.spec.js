import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP2-001: Icon nav exposes tab semantics + default expansion', () => {
  test('Manage tile starts expanded with aria wiring and peers collapsed', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const nav = document.getElementById('adminNav');
      expect(nav.getAttribute('role')).toBe('tablist');

      const manageButton = harness.manageNavButton;
      expect(manageButton).not.toBeNull();
      expect(manageButton.getAttribute('role')).toBe('tab');
      expect(manageButton.getAttribute('aria-expanded')).toBe('true');
      expect(manageButton.getAttribute('aria-controls')).toBe('addBookPanel');
      expect(harness.addBookPanel.open).toBe(true);

      const bundlesButton = harness.bundlesNavButton;
      expect(bundlesButton).not.toBeNull();
      expect(bundlesButton.getAttribute('role')).toBe('tab');
      expect(bundlesButton.getAttribute('aria-expanded')).toBe('false');
      expect(bundlesButton.getAttribute('aria-controls')).toBe('bundlesPanel');
    } finally {
      harness.cleanup();
    }
  });
});
