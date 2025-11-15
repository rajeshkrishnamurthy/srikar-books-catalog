import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP2-003: Sale sub nav honors #sale/record deep link', () => {
  test('Loading #sale/record selects the Sale tile and Record sub tab', async () => {
    const harness = await createAdminMainHarness({ initialHash: '#sale/record' });
    try {
      await harness.simulateSignIn();

      const saleButton = harness.recordSaleNavButton;
      expect(saleButton?.getAttribute('aria-current')).toBe('page');

      const saleSubNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="recordSale"]'
      );
      expect(saleSubNav).not.toBeNull();
      expect(saleSubNav?.hidden).toBe(false);

      const recordTab = saleSubNav?.querySelector('[data-manage-tab="record"]');
      expect(recordTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#sale/record');
    } finally {
      harness.cleanup();
    }
  });
});
