import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP3-001: Book Requests sub nav mirrors shared helper', () => {
  test('Clicking Book requests shows Open/Closed tabs and toggles hash/panels', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const bookRequestsBtn = harness.bookRequestsNavButton;
      expect(bookRequestsBtn).not.toBeNull();

      fireEvent.click(bookRequestsBtn);

      const subNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="bookRequests"]'
      );
      expect(subNav).not.toBeNull();
      expect(subNav?.hidden).toBe(false);

      const closedTab = subNav?.querySelector('[data-manage-tab="closed"]');
      expect(closedTab).not.toBeNull();

      fireEvent.click(closedTab);

      expect(window.location.hash).toBe('#book-requests/closed');
      expect(closedTab?.getAttribute('aria-current')).toBe('page');

      const openPanel = document.getElementById('bookRequestsOpenPanel');
      const closedPanel = document.getElementById('bookRequestsClosedPanel');
      expect(openPanel?.hidden).toBe(true);
      expect(closedPanel?.hidden).toBe(false);
    } finally {
      harness.cleanup();
    }
  });

  test('Deep-link #book-requests/closed preselects Closed tab', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#book-requests/closed' });
    try {
      await harness.simulateSignIn();

      const bookRequestsBtn = harness.bookRequestsNavButton;
      expect(bookRequestsBtn?.getAttribute('aria-current')).toBe('page');

      const subNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="bookRequests"]'
      );
      const closedTab = subNav?.querySelector('[data-manage-tab="closed"]');
      expect(closedTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#book-requests/closed');
    } finally {
      harness.cleanup();
    }
  });
});
