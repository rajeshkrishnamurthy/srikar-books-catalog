import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

const EXPECTED_LINKS = {
  manageBooks: 'addBookPanel',
  bundles: 'bundlesPanel',
  recordSale: 'saleEntryPanel',
  bookRequests: 'bookRequestsPanel',
  suppliers: 'suppliersPanel',
  customers: 'customerPanel',
};

describe('SPEC F15-TP1-002: Admin nav buttons expose aria-controls for their panels', () => {
  test('Each nav item wires aria-controls to a real panel element', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();
      const navButtons = Array.from(
        document.querySelectorAll('#adminNav [data-nav]')
      );

      navButtons.forEach((btn) => {
        const key = btn.dataset.nav;
        if (!EXPECTED_LINKS[key]) return;
        const ariaControls = btn.getAttribute('aria-controls');
        expect(ariaControls).toBe(EXPECTED_LINKS[key]);
        const panel = document.getElementById(ariaControls);
        expect(panel).not.toBeNull();
      });

      Object.entries(EXPECTED_LINKS).forEach(([key, panelId]) => {
        const button = document.querySelector(`#adminNav [data-nav="${key}"]`);
        expect(button).not.toBeNull();
        expect(button?.getAttribute('aria-controls')).toBe(panelId);
      });
    } finally {
      harness.cleanup();
    }
  });
});
