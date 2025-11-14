import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP3-001: Bundles nav loads a dedicated page', () => {
  test('Clicking Bundles hides the Manage panels and reveals the bundles screen', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bundlesBtn = harness.bundlesNavButton;
      expect(bundlesBtn).not.toBeNull();
      fireEvent.click(bundlesBtn);

      const addBookPanel = harness.addBookPanel;
      const availableBooksPanel = document.getElementById('availableBooksPanel');
      const soldBooksPanel = document.getElementById('soldBooksPanel');
      const bundlesPanel = document.getElementById('bundlesPanel');

      expect(addBookPanel).not.toBeNull();
      expect(availableBooksPanel).not.toBeNull();
      expect(soldBooksPanel).not.toBeNull();
      expect(bundlesPanel).not.toBeNull();

      expect(addBookPanel.hidden).toBe(true);
      expect(addBookPanel.open).toBe(false);

      expect(availableBooksPanel.hidden).toBe(true);
      expect(availableBooksPanel.open).toBe(false);

      expect(soldBooksPanel.hidden).toBe(true);
      expect(soldBooksPanel.open).toBe(false);

      expect(bundlesPanel.hidden).toBe(false);
      expect(bundlesBtn.getAttribute('aria-current')).toBe('page');
    } finally {
      harness.cleanup();
    }
  });
});
