import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP2-002: Add tab resets hash and hides other panels', () => {
  test('Switching from Available back to Add hides the lists and restores #add-book', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const subNav = document.getElementById('manageSubNav');
      const addTab = subNav?.querySelector('[data-manage-tab="add"]');
      const availableTab = subNav?.querySelector('[data-manage-tab="available"]');
      expect(addTab).not.toBeNull();
      expect(availableTab).not.toBeNull();

      fireEvent.click(availableTab);
      expect(window.location.hash).toBe('#manage-books/available');

      fireEvent.click(addTab);
      expect(window.location.hash).toBe('#add-book');
      expect(addTab?.getAttribute('aria-current')).toBe('page');
      expect(availableTab?.hasAttribute('aria-current')).toBe(false);

      const availablePanel = document.getElementById('availableBooksPanel');
      const soldPanel = document.getElementById('soldBooksPanel');
      expect(availablePanel.hidden).toBe(true);
      expect(soldPanel.hidden).toBe(true);
    } finally {
      harness.cleanup();
    }
  });
});
