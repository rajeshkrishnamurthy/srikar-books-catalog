import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F09-TP2-004: Manual overrides preserve supplier snapshot on save', () => {
  test('editing the hint text manually does not change the supplier stored in line payloads', async () => {
    const harness = await createSalesLineItemsHarness({
      buildLineId: () => 'line-ctx',
    });
    const book = {
      id: 'book-123',
      title: 'Inclusive Systems',
      supplier: { id: 'sup-5', name: 'Shelf Life', location: 'Mumbai' },
      history: { lastSellingPrice: 600, purchasePrice: 420 },
    };

    harness.selectBook(book);
    harness.supplierHintEl.textContent = 'Manually typed override';
    harness.typePrice('750');
    harness.submitLine();

    const payload = harness.onLinesChange.mock.calls[0][0][0];
    expect(payload.supplier).toMatchObject({
      id: 'sup-5',
      name: 'Shelf Life',
      location: 'Mumbai',
    });
    expect(harness.lineItemsBody.children).toHaveLength(1);
  });
});
