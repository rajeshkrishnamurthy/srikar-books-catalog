import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP3-003: #manage-books/available deep link selects Available tab', () => {
  test('Loading #manage-books/available activates the Available view on boot', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#manage-books/available' });
    try {
      await harness.simulateSignIn();

      const availableTab = document.querySelector('[data-manage-tab="available"]');
      expect(availableTab).not.toBeNull();
      expect(availableTab?.getAttribute('aria-current')).toBe('page');

      const addTab = document.querySelector('[data-manage-tab="add"]');
      expect(addTab?.hasAttribute('aria-current')).toBe(false);

      const addPanel = harness.addBookPanel;
      const availablePanel = document.getElementById('availableBooksPanel');
      expect(addPanel.hidden).toBe(true);
      expect(availablePanel.hidden).toBe(false);
      expect(window.location.hash).toBe('#manage-books/available');
    } finally {
      harness.cleanup();
    }
  });
});
