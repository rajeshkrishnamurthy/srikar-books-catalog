import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F17-TP2-002: Sale sub nav renders with shared helper', () => {
  test('Clicking Sale reveals a dropdown with Record tab using shared helper', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const saleButton = harness.recordSaleNavButton;
      expect(saleButton).not.toBeNull();

      fireEvent.click(saleButton);

      const saleSubNav = document.querySelector(
        '.manage-sub-nav[data-parent-nav="recordSale"]'
      );
      expect(saleSubNav).not.toBeNull();
      expect(saleSubNav?.hidden).toBe(false);

      const tabKeys = Array.from(
        saleSubNav?.querySelectorAll('button[data-manage-tab]') ?? []
      ).map((btn) => btn.dataset.manageTab);
      expect(tabKeys).toEqual(['record']);

      const recordTab = saleSubNav?.querySelector('[data-manage-tab="record"]');
      expect(recordTab?.getAttribute('aria-current')).toBe('page');
      expect(window.location.hash).toBe('#sale/record');
    } finally {
      harness.cleanup();
    }
  });
});
