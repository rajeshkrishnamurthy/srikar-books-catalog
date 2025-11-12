import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';
import { jest } from '@jest/globals';

function buildReadyHeaderState() {
  return {
    isReady: () => true,
    onReadyChange(cb = () => {}) {
      cb(true);
      return () => {};
    },
  };
}

describe('SPEC F09-TP2-007: Supplier selection is mandatory but overridable', () => {
  test('clearing the supplier selection disables the Add line button and surfaces an inline error', async () => {
    const harness = await createSalesLineItemsHarness({
      headerState: buildReadyHeaderState(),
    });
    harness.setSupplierOptions([{ id: 'sup-1', name: 'Shelf Life' }]);

    harness.selectBook({
      id: 'book-21',
      title: 'Inclusive Systems',
      supplier: { id: 'sup-1', name: 'Shelf Life', location: 'Mumbai' },
    });
    harness.typePrice('450');
    harness.clearSupplierSelection();
    harness.submitLine();

    expect(harness.addLineBtn.disabled).toBe(true);
    expect(harness.msgEl.textContent.toLowerCase()).toContain('supplier');
  });

  test('choosing a different supplier from the dropdown persists that supplier in the emitted payload', async () => {
    const onLinesChange = jest.fn();
    const harness = await createSalesLineItemsHarness({
      headerState: buildReadyHeaderState(),
      onLinesChange,
      buildLineId: () => 'line-supplier',
    });
    harness.setSupplierOptions([
      { id: 'sup-1', name: 'Shelf Life', location: 'Mumbai' },
      { id: 'sup-2', name: 'Rare Reads', location: 'Delhi' },
    ]);

    harness.selectBook({
      id: 'book-22',
      title: 'Working in Public',
      supplier: { id: 'sup-1', name: 'Shelf Life', location: 'Mumbai' },
    });
    harness.selectSupplier('sup-2');
    harness.typePrice('550');
    harness.submitLine();

    const payload = onLinesChange.mock.calls[0][0][0];
    expect(payload.supplier).toMatchObject({
      id: 'sup-2',
      name: 'Rare Reads',
      location: 'Delhi',
    });
  });
});
