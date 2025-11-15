import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP2-001: Add tab shows only the Add Book workflow', () => {
  test('Landing on Manage keeps only the Add Book panel visible', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const addPanel = harness.addBookPanel;
      const availablePanel = document.getElementById('availableBooksPanel');
      const soldPanel = document.getElementById('soldBooksPanel');
      const addTab = document.querySelector('#manageSubNav [data-manage-tab="add"]');

      expect(addTab).not.toBeNull();
      expect(addTab?.getAttribute('aria-current')).toBe('page');

      expect(addPanel).not.toBeNull();
      expect(addPanel.hidden).toBe(false);
      expect(addPanel.open).toBe(true);

      expect(availablePanel).not.toBeNull();
      expect(availablePanel.hidden).toBe(true);
      expect(availablePanel.open).toBe(false);

      expect(soldPanel).not.toBeNull();
      expect(soldPanel.hidden).toBe(true);
      expect(soldPanel.open).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
