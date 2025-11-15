import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP2-003: Nav button routing keeps tile expanded', () => {
  test('Clicking the Bundles nav button updates the hash and keeps the tile active', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bundlesBtn = harness.bundlesNavButton;
      fireEvent.click(bundlesBtn);

      expect(window.location.hash).toBe('#bundles/create');
      expect(bundlesBtn.getAttribute('aria-expanded')).toBe('true');
      expect(document.getElementById('bundlesPanel').hidden).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
