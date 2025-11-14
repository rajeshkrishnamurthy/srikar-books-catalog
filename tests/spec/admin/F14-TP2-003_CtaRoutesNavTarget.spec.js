import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP2-003: Detail CTAs route to the target section', () => {
  test('Clicking the Bundles CTA updates the hash and keeps the Bundles tile expanded', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bundlesBtn = harness.bundlesNavButton;
      fireEvent.click(bundlesBtn);

      const bundlesCta = harness.getNavCta('bundles');
      expect(bundlesCta).not.toBeNull();
      fireEvent.click(bundlesCta);

      expect(window.location.hash).toBe('#bundles');
      expect(bundlesBtn.getAttribute('aria-expanded')).toBe('true');
      expect(harness.getNavDetail('bundles').hidden).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
