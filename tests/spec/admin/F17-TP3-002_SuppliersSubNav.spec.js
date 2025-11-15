import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP3-002: Suppliers sub nav exposes Create/Manage views', () => {
  test('Suppliers nav toggles between Create and Manage panels with canonical hash', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const suppliersBtn = harness.suppliersNavButton;
      expect(suppliersBtn).not.toBeNull();
      fireEvent.click(suppliersBtn);

      const subNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="suppliers"]'
      );
      expect(subNav).not.toBeNull();
      expect(subNav?.hidden).toBe(false);

      const manageTab = subNav?.querySelector('[data-manage-tab="manage"]');
      fireEvent.click(manageTab);

      expect(window.location.hash).toBe('#suppliers/manage');
      expect(manageTab?.getAttribute('aria-current')).toBe('page');
      expect(document.getElementById('supplierCreatePanel')?.hidden).toBe(true);
      expect(document.getElementById('supplierManagePanel')?.hidden).toBe(false);
    } finally {
      harness.cleanup();
    }
  });

  test('Deep links #suppliers/manage preselect Manage tab', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#suppliers/manage' });
    try {
      await harness.simulateSignIn();
      const subNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="suppliers"]'
      );
      const manageTab = subNav?.querySelector('[data-manage-tab="manage"]');
      expect(manageTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#suppliers/manage');
    } finally {
      harness.cleanup();
    }
  });
});
