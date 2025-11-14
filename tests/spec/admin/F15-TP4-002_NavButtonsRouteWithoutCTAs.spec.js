import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F15-TP4-002: Nav buttons route without detail CTAs', () => {
  test('Clicking Bundles nav button routes immediately without relying on detail CTA buttons', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bundlesButton = harness.bundlesNavButton;
      expect(bundlesButton).not.toBeNull();

      const bundlesDetailCTA = document.querySelector('#navDetail-bundles .admin-nav__cta');
      expect(bundlesDetailCTA).toBeNull();

      fireEvent.click(bundlesButton);

      expect(window.location.hash).toBe('#bundles');
      expect(bundlesButton.getAttribute('aria-current')).toBe('page');
    } finally {
      harness.cleanup();
    }
  });
});
