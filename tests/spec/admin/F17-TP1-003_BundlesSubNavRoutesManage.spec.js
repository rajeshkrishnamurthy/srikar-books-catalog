import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP1-003: Bundles sub nav routes Manage tab', () => {
  test('Selecting Manage rewrites hash and updates aria-current', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bundlesButton = harness.bundlesNavButton;
      expect(bundlesButton).not.toBeNull();
      fireEvent.click(bundlesButton);

      const bundlesSubNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="bundles"]'
      );
      expect(bundlesSubNav).not.toBeNull();

      const manageTab = bundlesSubNav?.querySelector('[data-manage-tab="manage"]');
      expect(manageTab).not.toBeNull();

      fireEvent.click(manageTab);

      expect(window.location.hash).toBe('#bundles/manage');
      expect(manageTab?.getAttribute('aria-current')).toBe('page');

      const createTab = bundlesSubNav?.querySelector('[data-manage-tab="create"]');
      expect(createTab?.hasAttribute('aria-current')).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
