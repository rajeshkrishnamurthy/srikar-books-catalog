import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP3-003: Returning to Manage restores the default workspace', () => {
  test('Switching back to Manage reopens its panels and hides the previous task page', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bundlesBtn = harness.bundlesNavButton;
      const manageBtn = harness.manageNavButton;
      expect(bundlesBtn).not.toBeNull();
      expect(manageBtn).not.toBeNull();

      fireEvent.click(bundlesBtn);
      fireEvent.click(manageBtn);

      const addBookPanel = harness.addBookPanel;
      const availableBooksPanel = document.getElementById('availableBooksPanel');
      const soldBooksPanel = document.getElementById('soldBooksPanel');
      const bundlesPanel = document.getElementById('bundlesPanel');

      expect(addBookPanel).not.toBeNull();
      expect(availableBooksPanel).not.toBeNull();
      expect(soldBooksPanel).not.toBeNull();
      expect(bundlesPanel).not.toBeNull();

      expect(addBookPanel.hidden).toBe(false);
      expect(addBookPanel.open).toBe(true);
      expect(availableBooksPanel.hidden).toBe(false);
      expect(availableBooksPanel.open).toBe(true);
      expect(soldBooksPanel.hidden).toBe(false);
      expect(soldBooksPanel.open).toBe(true);

      expect(bundlesPanel.hidden).toBe(true);
      expect(manageBtn.getAttribute('aria-current')).toBe('page');
      expect(bundlesBtn.getAttribute('aria-current')).toBeNull();
    } finally {
      harness.cleanup();
    }
  });
});
