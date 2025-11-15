import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP1-002: Bundles sub nav renders with shared helper', () => {
  test('Clicking Bundles reveals a Create/Manage dropdown wired like Manage Books', async () => {
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
      expect(bundlesSubNav?.hidden).toBe(false);

      const tabKeys = Array.from(
        bundlesSubNav?.querySelectorAll('button[data-manage-tab]') ?? []
      ).map((btn) => btn.dataset.manageTab);
      expect(tabKeys).toEqual(['create', 'manage']);

      const createTab = bundlesSubNav?.querySelector('[data-manage-tab="create"]');
      expect(createTab?.getAttribute('aria-current')).toBe('page');
    } finally {
      harness.cleanup();
    }
  });
});
