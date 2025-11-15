import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP1-001: Manage Books renders secondary sub nav', () => {
  test('Sub nav shows Add, Available, and Sold when Manage loads', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const subNav = document.getElementById('manageSubNav');
      expect(subNav).not.toBeNull();

      const manageTabs = Array.from(
        subNav.querySelectorAll('button[data-manage-tab]')
      );
      const tabKeys = manageTabs.map((btn) => btn.dataset.manageTab);
      expect(tabKeys).toEqual(['add', 'available', 'sold']);

      const addTab = subNav.querySelector('[data-manage-tab="add"]');
      expect(addTab).not.toBeNull();
      expect(addTab.getAttribute('aria-current')).toBe('page');
    } finally {
      harness.cleanup();
    }
  });
});
