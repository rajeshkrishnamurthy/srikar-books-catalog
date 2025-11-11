import { createSalesPersistHarness } from '../../fixtures/salesPersistHarness.js';

describe('SPEC F08-TP3-003: Line status feedback during sale persistence', () => {
  test('displays a success badge for each line item when the sale saves', async () => {
    const harness = await createSalesPersistHarness({
      formatCurrency: (amount) => `₹${amount}`,
    });
    harness.setHeaderPayload({
      customerId: 'cust-4',
      saleDateIso: '2024-05-03',
    });
    harness.setLineItems([
      { lineId: 'line-10', bookTitle: 'Inclusive Systems', sellingPrice: 320 },
      { lineId: 'line-11', bookTitle: 'Signals', sellingPrice: 280 },
    ]);

    await harness.submit();

    const { children } = harness.lineStatusList;
    expect(children).toHaveLength(2);
    [...children].forEach((item) => {
      expect(item.dataset.state).toBe('success');
      expect(item.textContent).toMatch(/Saved/i);
      expect(item.textContent).toMatch(/₹/);
    });
  });

  test('marks each line as failed when Firestore rejects the sale document', async () => {
    const harness = await createSalesPersistHarness({
      addDocImpl: async () => {
        throw new Error('offline');
      },
    });
    harness.setHeaderPayload({
      customerId: 'cust-5',
      saleDateIso: '2024-05-04',
    });
    harness.setLineItems([{ lineId: 'line-91', bookTitle: 'Grid Systems', sellingPrice: 700 }]);

    await expect(harness.submit()).resolves.toBeUndefined();

    expect(harness.lineStatusList.children).toHaveLength(1);
    const statusRow = harness.lineStatusList.children[0];
    expect(statusRow.dataset.state).toBe('error');
    expect(statusRow.textContent).toMatch(/Failed/i);
    expect(harness.msgEl.textContent.toLowerCase()).toContain('failed');
  });
});
