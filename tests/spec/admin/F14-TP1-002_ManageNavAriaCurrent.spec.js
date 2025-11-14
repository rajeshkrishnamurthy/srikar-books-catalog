import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP1-002: Manage books nav tile announces default landing', () => {
  test('Manage tile gains aria-current="page" and peers clear the attribute after sign-in', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      expect(harness.manageNavButton).not.toBeNull();
      expect(harness.manageNavButton.getAttribute('aria-current')).toBe('page');

      expect(harness.bookRequestsNavButton).not.toBeNull();
      expect(harness.bookRequestsNavButton.hasAttribute('aria-current')).toBe(
        false
      );

      expect(harness.suppliersNavButton).not.toBeNull();
      expect(harness.suppliersNavButton.hasAttribute('aria-current')).toBe(
        false
      );
    } finally {
      harness.cleanup();
    }
  });
});
