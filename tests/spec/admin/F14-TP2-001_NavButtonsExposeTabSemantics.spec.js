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
      expect(manageButton.getAttribute('aria-controls')).toBe(
        'navDetail-manageBooks'
      );

      const manageDetail = harness.getNavDetail('manageBooks');
      expect(manageDetail).not.toBeNull();
      expect(manageDetail.hidden).toBe(false);

      const bundlesButton = harness.bundlesNavButton;
      const bundlesDetail = harness.getNavDetail('bundles');
      expect(bundlesButton).not.toBeNull();
      expect(bundlesButton.getAttribute('role')).toBe('tab');
      expect(bundlesButton.getAttribute('aria-expanded')).toBe('false');
      expect(bundlesButton.getAttribute('aria-controls')).toBe(
        'navDetail-bundles'
      );
      expect(bundlesDetail).not.toBeNull();
      expect(bundlesDetail.hidden).toBe(true);
    } finally {
      harness.cleanup();
    }
  });
});
