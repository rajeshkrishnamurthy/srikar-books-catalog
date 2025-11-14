import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F15-TP2-001: Customers nav opens the Customer Master panel', () => {
  test('Clicking the Customers nav button expands the panel and marks the nav as current', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const customersButton = harness.customersNavButton;
      const customersPanel = harness.customersPanelSection;
      expect(customersButton).not.toBeNull();
      expect(customersPanel).not.toBeNull();

      // ensure default landing collapsed the panel
      expect(customersPanel.hidden).toBe(true);
      if (customersPanel.tagName === 'DETAILS') {
        expect(customersPanel.open).toBe(false);
      }

      expect(window.location.hash).toBe('#add-book');

      fireEvent.click(customersButton);

      expect(customersPanel.hidden).toBe(false);
      if (customersPanel.tagName === 'DETAILS') {
        expect(customersPanel.open).toBe(true);
      }
      expect(customersButton.getAttribute('aria-current')).toBe('page');
      expect(harness.manageNavButton.hasAttribute('aria-current')).toBe(false);
      expect(window.location.hash).toBe('#customers');
    } finally {
      harness.cleanup();
    }
  });
});
