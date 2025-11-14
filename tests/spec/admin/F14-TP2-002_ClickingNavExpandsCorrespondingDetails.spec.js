import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP2-002: Clicking a nav tile expands its detail drawer', () => {
  test('Switching from Manage to Bundles toggles aria-expanded and detail visibility', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const manageBtn = harness.manageNavButton;
      const manageDetail = harness.getNavDetail('manageBooks');
      expect(manageBtn.getAttribute('aria-expanded')).toBe('true');
      expect(manageDetail.hidden).toBe(false);

      const bundlesBtn = harness.bundlesNavButton;
      const bundlesDetail = harness.getNavDetail('bundles');
      fireEvent.click(bundlesBtn);

      expect(bundlesBtn.getAttribute('aria-expanded')).toBe('true');
      expect(bundlesDetail.hidden).toBe(false);

      expect(manageBtn.getAttribute('aria-expanded')).toBe('false');
      expect(manageDetail.hidden).toBe(true);
    } finally {
      harness.cleanup();
    }
  });
});
