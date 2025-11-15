import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP1-003: Manage sub nav honors deep links', () => {
  test('Loading #manage-books/sold selects the Sold tab', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#manage-books/sold' });
    try {
      await harness.simulateSignIn();

      const subNav = document.getElementById('manageSubNav');
      expect(subNav).not.toBeNull();
      const soldTab = subNav?.querySelector('[data-manage-tab="sold"]');
      expect(soldTab).not.toBeNull();
      expect(soldTab.getAttribute('aria-current')).toBe('page');

      const manageButton = harness.manageNavButton;
      expect(manageButton.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#manage-books/sold');
    } finally {
      harness.cleanup();
    }
  });
});
