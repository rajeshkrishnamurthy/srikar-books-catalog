import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP4-002: Sold tab honors deep links', () => {
  test('Loading #manage-books/sold selects the Sold tab and hides other panels', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#manage-books/sold' });
    try {
      await harness.simulateSignIn();

      const soldTab = document.querySelector('[data-manage-tab="sold"]');
      const addTab = document.querySelector('[data-manage-tab="add"]');
      expect(soldTab?.getAttribute('aria-current')).toBe('page');
      expect(addTab?.hasAttribute('aria-current')).toBe(false);

      const addPanel = harness.addBookPanel;
      const availablePanel = document.getElementById('availableBooksPanel');
      const soldPanel = document.getElementById('soldBooksPanel');
      expect(addPanel.hidden).toBe(true);
      expect(availablePanel.hidden).toBe(true);
      expect(soldPanel.hidden).toBe(false);
      expect(window.location.hash).toBe('#manage-books/sold');
    } finally {
      harness.cleanup();
    }
  });
});
