import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F15-TP2-002: Customers nav preserves Customer Master form state', () => {
  test('Switching between Manage and Customers keeps entered form data intact', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const customersButton = harness.customersNavButton;
      const manageButton = harness.manageNavButton;
      const nameInput = document.getElementById('customerNameInput');
      expect(nameInput).not.toBeNull();

      // Enter data before toggling panels
      nameInput.value = 'Mouse-Only Customer';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      fireEvent.click(customersButton);
      expect(customersButton.getAttribute('aria-current')).toBe('page');

      // Toggle away and back to ensure data persists
      fireEvent.click(manageButton);
      expect(manageButton.getAttribute('aria-current')).toBe('page');
      fireEvent.click(customersButton);

      expect(nameInput.value).toBe('Mouse-Only Customer');
    } finally {
      harness.cleanup();
    }
  });
});
