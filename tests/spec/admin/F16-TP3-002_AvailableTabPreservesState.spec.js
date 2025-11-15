import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP3-002: Available tab preserves list state', () => {
  test('After typing in available search, switching away and back restores the same list view', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const availableTab = document.querySelector('[data-manage-tab="available"]');
      const addTab = document.querySelector('[data-manage-tab="add"]');
      expect(availableTab).not.toBeNull();
      expect(addTab).not.toBeNull();

      fireEvent.click(availableTab);
      const availableSearch = document.getElementById('availableSearchInput');
      expect(availableSearch).not.toBeNull();
      availableSearch.value = 'history';
      availableSearch.dispatchEvent(new Event('input', { bubbles: true }));

      fireEvent.click(addTab);
      expect(window.location.hash).toBe('#add-book');

      fireEvent.click(availableTab);
      expect(window.location.hash).toBe('#manage-books/available');
      expect(availableTab?.getAttribute('aria-current')).toBe('page');
      expect(addTab?.hasAttribute('aria-current')).toBe(false);
      expect(availableSearch.value).toBe('history');
    } finally {
      harness.cleanup();
    }
  });
});
