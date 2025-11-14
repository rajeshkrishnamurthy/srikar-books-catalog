import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F15-TP3-002: ?section deep link normalizes to canonical hash', () => {
  test('?section=customer-master activates Customers and trims the query string', async () => {
    const harness = await createAdminMainHarness({ initialSearch: '?section=customer-master' });
    try {
      await harness.simulateSignIn();

      const customersButton = harness.customersNavButton;
      expect(customersButton).not.toBeNull();
      expect(customersButton.getAttribute('aria-current')).toBe('page');

      expect(window.location.hash).toBe('#customers');
      expect(window.location.search).toBe('');

      const customersPanel = harness.customersPanelSection;
      expect(customersPanel).not.toBeNull();
      expect(customersPanel.hidden).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
