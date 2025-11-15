import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP3-001: Available tab shows only the Available list', () => {
  test('Switching to Available hides Add/Sold panels and shows only the list view', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const subNav = document.getElementById('manageSubNav');
      const availableTab = subNav?.querySelector('[data-manage-tab="available"]');
      expect(availableTab).not.toBeNull();

      fireEvent.click(availableTab);

      expect(availableTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#manage-books/available');

      const addPanel = harness.addBookPanel;
      const availablePanel = document.getElementById('availableBooksPanel');
      const soldPanel = document.getElementById('soldBooksPanel');

      expect(addPanel.hidden).toBe(true);
      expect(addPanel.open).toBe(false);
      expect(availablePanel.hidden).toBe(false);
      expect(availablePanel.open).toBe(true);
      expect(soldPanel.hidden).toBe(true);
      expect(soldPanel.open).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
