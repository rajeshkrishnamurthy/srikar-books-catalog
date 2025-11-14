import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

const EXPECTED_NAV_KEYS = [
  'manageBooks',
  'bundles',
  'recordSale',
  'bookRequests',
  'suppliers',
  'customers',
];

describe('SPEC F15-TP1-001: Admin nav renders entries for every major panel', () => {
  test('Nav includes Manage, Bundles, Record Sale, Book Requests, Suppliers, and Customers', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();
      const navButtons = Array.from(
        document.querySelectorAll('#adminNav [data-nav]')
      );
      const navKeys = navButtons.map((btn) => btn.dataset.nav);

      EXPECTED_NAV_KEYS.forEach((key) =>
        expect(navKeys).toContain(key)
      );
      expect(navButtons).toHaveLength(EXPECTED_NAV_KEYS.length);
    } finally {
      harness.cleanup();
    }
  });
});
