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
    const row = harness.lineItemsBody.querySelector(`[data-book-id="${book.id}"]`);
    expect(row).toBeTruthy();
  });
}

describe('SPEC F11-TP1-003: Remove controls respect the sale header lock', () => {
  test('when the header becomes locked, remove buttons disable and ignore clicks', async () => {
    const headerState = buildHeaderState(true);
    const harness = await createSalesLineItemsHarness({
      headerState,
      buildLineId: () => 'line-astro',
    });

    const supplier = { id: 'sup-1', name: 'Rare Reads' };
    harness.setSupplierOptions([supplier]);

    const book = { id: 'astro', title: 'Astrophysics 101' };
    await addLine(harness, { book, supplier });

    const row = harness.lineItemsBody.querySelector('[data-line-id="line-astro"]');
    expect(row).not.toBeNull();
    const removeBtn = row.querySelector('button.sale-line-remove');
    expect(removeBtn).not.toBeNull();

    headerState.setReady(false);

    await waitFor(() => {
      expect(removeBtn.disabled).toBe(true);
      expect(removeBtn.getAttribute('aria-disabled')).toBe('true');
    });

    fireEvent.click(removeBtn);

    expect(row.dataset.removePending).not.toBe('true');
    expect(harness.removalStatusEl.textContent.trim()).toBe('');
  });
});
