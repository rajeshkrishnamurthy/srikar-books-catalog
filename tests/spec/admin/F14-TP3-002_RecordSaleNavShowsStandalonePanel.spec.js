import { fireEvent } from '@testing-library/dom';
import { createAdminMainHarness } from '../../fixtures/adminMainHarness.js';

describe('SPEC F14-TP3-002: Record Sale nav loads a standalone page', () => {
  test('Record Sale shows its panel while Manage panels stay collapsed', async () => {
    const harness = await createAdminMainHarness();
    try {
      await harness.simulateSignIn();

      const recordSaleBtn = harness.recordSaleNavButton;
      expect(recordSaleBtn).not.toBeNull();
      fireEvent.click(recordSaleBtn);

      const saleEntryPanel = document.getElementById('saleEntryPanel');
      const addBookPanel = harness.addBookPanel;
      const availableBooksPanel = document.getElementById('availableBooksPanel');
      const soldBooksPanel = document.getElementById('soldBooksPanel');

      expect(saleEntryPanel).not.toBeNull();
      expect(addBookPanel).not.toBeNull();
      expect(availableBooksPanel).not.toBeNull();
      expect(soldBooksPanel).not.toBeNull();

      expect(saleEntryPanel.hidden).toBe(false);
      expect(addBookPanel.hidden).toBe(true);
      expect(addBookPanel.open).toBe(false);

      expect(availableBooksPanel.hidden).toBe(true);
      expect(availableBooksPanel.open).toBe(false);

      expect(soldBooksPanel.hidden).toBe(true);
      expect(soldBooksPanel.open).toBe(false);

      expect(recordSaleBtn.getAttribute('aria-current')).toBe('page');
    } finally {
      harness.cleanup();
    }
  });
});
