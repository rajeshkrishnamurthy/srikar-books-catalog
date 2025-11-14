import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP1-001: Default workspace hides non-Manage panels', () => {
  test('Book Requests and Suppliers collapse when the admin lands without a nav hash', async () => {
    const harness = await createAdminMainHarness({ initialHash: '' });
    try {
      await harness.simulateSignIn();

      expect(harness.addBookPanel).not.toBeNull();
      expect(harness.addBookPanel.open).toBe(true);

      expect(harness.bookRequestsPanel).not.toBeNull();
      expect(harness.bookRequestsPanel.hidden).toBe(true);
      expect(harness.bookRequestsPanel.open).toBe(false);

      expect(harness.suppliersPanel).not.toBeNull();
      expect(harness.suppliersPanel.hidden).toBe(true);
      expect(harness.suppliersPanel.open).toBe(false);
    } finally {
      harness.cleanup();
    }
  });
});
