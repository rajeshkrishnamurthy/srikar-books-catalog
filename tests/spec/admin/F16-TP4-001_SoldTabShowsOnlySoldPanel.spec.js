import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP4-001: Sold tab shows only the Sold list', () => {
  test('Clicking Sold hides Add/Available and shows only the Sold view', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const soldTab = document.querySelector('[data-manage-tab="sold"]');
      expect(soldTab).not.toBeNull();

      fireEvent.click(soldTab);

      expect(soldTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#manage-books/sold');

      const addPanel = harness.addBookPanel;
      const availablePanel = document.getElementById('availableBooksPanel');
      const soldPanel = document.getElementById('soldBooksPanel');

      expect(addPanel.hidden).toBe(true);
      expect(availablePanel.hidden).toBe(true);
      expect(soldPanel.hidden).toBe(false);
      expect(soldPanel.open).toBe(true);
    } finally {
      harness.cleanup();
    }
  });
});
