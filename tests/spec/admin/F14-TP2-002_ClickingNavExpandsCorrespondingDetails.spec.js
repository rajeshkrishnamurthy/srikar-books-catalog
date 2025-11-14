import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP2-002: Clicking a nav tile expands its detail drawer', () => {
  test('Switching from Manage to Bundles toggles aria-expanded and detail visibility', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const manageBtn = harness.manageNavButton;
      const addPanel = harness.addBookPanel;
      expect(manageBtn.getAttribute('aria-expanded')).toBe('true');
      expect(addPanel.open).toBe(true);

      const bundlesBtn = harness.bundlesNavButton;
      const bundlesPanel = document.getElementById('bundlesPanel');
      fireEvent.click(bundlesBtn);

      expect(bundlesBtn.getAttribute('aria-expanded')).toBe('true');
      expect(bundlesPanel.hidden).toBe(false);

      expect(manageBtn.getAttribute('aria-expanded')).toBe('false');
    } finally {
      harness.cleanup();
    }
  });
});
