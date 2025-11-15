import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP1-002: Manage sub nav routes to Available', () => {
  test('Clicking Available updates hash and active tab state', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const subNav = document.getElementById('manageSubNav');
      expect(subNav).not.toBeNull();
      const availableTab = subNav?.querySelector('[data-manage-tab="available"]');
      expect(availableTab).not.toBeNull();

      fireEvent.click(availableTab);

      expect(window.location.hash).toBe('#manage-books/available');
      expect(availableTab.getAttribute('aria-current')).toBe('page');
      const addTab = subNav.querySelector('[data-manage-tab="add"]');
      expect(addTab?.hasAttribute('aria-current')).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
