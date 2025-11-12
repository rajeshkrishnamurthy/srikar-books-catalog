import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

function buildReadyHeaderState() {
  return {
    isReady: () => true,
    onReadyChange(cb = () => {}) {
      cb(true);
      return () => {};
    },
  };
}

describe('SPEC F09-TP2-006: Supplier select prefills from book data', () => {
  test('selecting a book automatically selects the matching supplier option while keeping alternatives available', async () => {
    const harness = await createSalesLineItemsHarness({
      headerState: buildReadyHeaderState(),
    });
    harness.setSupplierOptions([
      { id: 'sup-1', name: 'Shelf Life', location: 'Mumbai' },
      { id: 'sup-9', name: 'Design Depot', location: 'Chennai' },
    ]);

    harness.selectBook({
      id: 'book-42',
      title: 'Design Systems',
      supplier: { id: 'sup-9', name: 'Design Depot', location: 'Chennai' },
    });

    expect(harness.supplierSelect.value).toBe('sup-9');
    const selectedOption = harness.supplierSelect.querySelector('option:checked');
    expect(selectedOption?.textContent).toContain('Design Depot');
    expect(selectedOption?.textContent).toContain('Chennai');
  });
});
