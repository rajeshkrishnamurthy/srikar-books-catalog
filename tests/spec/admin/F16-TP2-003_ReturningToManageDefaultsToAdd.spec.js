import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP2-003: Returning to Manage defaults to Add tab', () => {
  test('After visiting another nav section, clicking Manage reselects Add and shows only Add panel', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const subNav = document.getElementById('manageSubNav');
      const availableTab = subNav?.querySelector('[data-manage-tab="available"]');
      expect(availableTab).not.toBeNull();
      fireEvent.click(availableTab);

      const bundlesBtn = harness.bundlesNavButton;
      fireEvent.click(bundlesBtn);
      const manageBtn = harness.manageNavButton;
      fireEvent.click(manageBtn);

      const addTab = subNav?.querySelector('[data-manage-tab="add"]');
      expect(addTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#add-book');

      const availablePanel = document.getElementById('availableBooksPanel');
      const soldPanel = document.getElementById('soldBooksPanel');
      expect(availablePanel.hidden).toBe(true);
      expect(soldPanel.hidden).toBe(true);
    } finally {
      harness.cleanup();
    }
  });
});
