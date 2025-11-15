import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F16-TP4-003: Sold tab defaults when returning to Manage after a Sold deep link', () => {
  test('After navigating to Sold via deep link and leaving Manage, coming back defaults to Add tab', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#manage-books/sold' });
    try {
      await harness.simulateSignIn();

      const manageTab = document.querySelector('[data-manage-tab="add"]');
      expect(manageTab).not.toBeNull();

      const bundlesBtn = harness.bundlesNavButton;
      const manageBtn = harness.manageNavButton;

      fireEvent.click(bundlesBtn);
      fireEvent.click(manageBtn);

      expect(manageTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#add-book');
    } finally {
      harness.cleanup();
    }
  });
});
