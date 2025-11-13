import { fireEvent, waitFor } from '@testing-library/dom';
import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

function buildHeaderState(initialReady = true) {
  let ready = initialReady;
  const listeners = new Set();
  return {
    isReady: () => ready,
    onReadyChange(cb = () => {}) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    setReady(value) {
      ready = Boolean(value);
      listeners.forEach((cb) => cb(ready));
    },
  };
}

async function addLine(harness, { book, supplier, price = '500' }) {
  harness.selectBook({ ...book, supplier });
  harness.selectSupplier(supplier.id);
  harness.typePrice(price);
  harness.submitLine();
  await waitFor(() => {
    expect(harness.lineItemsBody.querySelector(`[data-book-id="${book.id}"]`)).toBeTruthy();
  });
}

describe('SPEC F11-TP2-001: Confirm removal deletes the row and logs status', () => {
  test('click remove → confirm removes the row, updates totals/state, and logs status text', async () => {
    const headerState = buildHeaderState(true);
    const harness = await createSalesLineItemsHarness({
      headerState,
      buildLineId: () => `line-${Math.random().toString(36).slice(2, 8)}`,
    });

    const supplier = { id: 'sup-1', name: 'Rare Reads' };
    harness.setSupplierOptions([supplier]);

    await addLine(harness, { book: { id: 'astro', title: 'Astrophysics 101' }, supplier });
    await addLine(harness, { book: { id: 'poetry', title: 'Poems of the Sun' }, supplier });

    const targetRow = harness.lineItemsBody.querySelector('[data-book-id="astro"]');
    expect(targetRow).not.toBeNull();
    const removeBtn = targetRow.querySelector('button.sale-line-remove');
    expect(removeBtn).not.toBeNull();

    fireEvent.click(removeBtn); // first click → pending
    expect(targetRow.dataset.removePending).toBe('true');
    expect(harness.lineItemsBody.querySelectorAll('.sale-line-row')).toHaveLength(2);

    fireEvent.click(removeBtn); // confirm

    await waitFor(() => {
      expect(harness.lineItemsBody.querySelectorAll('.sale-line-row')).toHaveLength(1);
      expect(harness.lineItemsBody.querySelector('[data-book-id="astro"]')).toBeNull();
    });

    const remainingIds = harness.api.getLines().map((line) => line.bookId);
    expect(remainingIds).toEqual(['poetry']);
    expect(harness.statusList.childElementCount).toBeGreaterThan(0);
    expect(harness.statusList.lastElementChild.textContent).toContain('Removed');
    expect(harness.statusList.lastElementChild.textContent).toContain('Astrophysics 101');
    expect(harness.removalStatusEl.textContent.toLowerCase()).toContain('removed');
  });
});
