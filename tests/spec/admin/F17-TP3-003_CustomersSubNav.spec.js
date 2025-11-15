import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP3-003: Customers sub nav supports Create/Manage views', () => {
  test('Customers nav defaults to Create and routes Manage via hash', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const customersBtn = harness.customersNavButton;
      expect(customersBtn).not.toBeNull();
      fireEvent.click(customersBtn);

      const subNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="customers"]'
      );
      expect(subNav).not.toBeNull();
      expect(subNav?.hidden).toBe(false);

      const manageTab = subNav?.querySelector('[data-manage-tab="manage"]');
      fireEvent.click(manageTab);

      expect(window.location.hash).toBe('#customers/manage');
      expect(manageTab?.getAttribute('aria-current')).toBe('page');
      expect(document.getElementById('customerCreatePanel')?.hidden).toBe(true);
      expect(document.getElementById('customerManagePanel')?.hidden).toBe(false);
    } finally {
      harness.cleanup();
    }
  });

  test('Deep-link #customers/manage highlights Manage tab', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#customers/manage' });
    try {
      await harness.simulateSignIn();
      const subNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="customers"]'
      );
      const manageTab = subNav?.querySelector('[data-manage-tab="manage"]');
      expect(manageTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#customers/manage');
    } finally {
      harness.cleanup();
    }
  });
});
