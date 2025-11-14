import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

const EXPECTED_NAV_KEYS = [
  'manageBooks',
  'bundles',
  'recordSale',
  'bookRequests',
  'suppliers',
  'customers',
];

describe('SPEC F15-TP1-003: Admin nav map is exposed for deep-link helpers', () => {
  test('Global nav map lists every nav key and panel id pairing', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();
      const navMap = window.__adminNavMap;
      expect(Array.isArray(navMap)).toBe(true);

      const navIds = Array.isArray(navMap)
        ? navMap.map((entry) => entry?.id)
        : [];
      const panelIds = Array.isArray(navMap)
        ? navMap.map((entry) => entry?.panelId)
        : [];

      EXPECTED_NAV_KEYS.forEach((navKey) =>
        expect(navIds).toContain(navKey)
      );
      EXPECTED_NAV_KEYS.forEach((navKey) => {
        const entryIndex = navIds.indexOf(navKey);
        expect(entryIndex).toBeGreaterThanOrEqual(0);
        expect(panelIds[entryIndex]).toEqual(expect.any(String));
        const panelEl = document.getElementById(panelIds[entryIndex]);
        expect(panelEl).not.toBeNull();
      });
    } finally {
      harness.cleanup();
    }
  });
});
