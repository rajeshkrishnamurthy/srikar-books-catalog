import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F15-TP3-003: Unknown deep link falls back to Manage Books', () => {
  test('Unrecognized hash activates default landing and #add-book', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#unknown-section' });
    try {
      await harness.simulateSignIn();

      const manageButton = harness.manageNavButton;
      expect(manageButton).not.toBeNull();
      expect(manageButton.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#add-book');

      const addPanel = harness.addBookPanel;
      expect(addPanel).not.toBeNull();
      expect(addPanel.open).toBe(true);
    } finally {
      harness.cleanup();
    }
  });
});
