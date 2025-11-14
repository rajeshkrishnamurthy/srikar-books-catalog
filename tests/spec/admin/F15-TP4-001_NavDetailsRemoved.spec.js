import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

const NAV_DETAIL_IDS = [
  'navDetail-manageBooks',
  'navDetail-bundles',
  'navDetail-recordSale',
  'navDetail-bookRequests',
  'navDetail-suppliers',
  'navDetail-customers',
];

describe('SPEC F15-TP4-001: Admin nav detail sections are removed', () => {
  test('navDetail-* nodes are absent so tiles render as simple buttons', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      NAV_DETAIL_IDS.forEach((detailId) => {
        const node = document.getElementById(detailId);
        expect(node).toBeNull();
      });
      const navDetailsWrap = document.getElementById('adminNavDetails');
      expect(navDetailsWrap).toBeNull();
    } finally {
      harness.cleanup();
    }
  });
});
