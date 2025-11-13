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

async function addLine(harness, { id, title, price, supplier }) {
  harness.selectBook({ id, title, supplier });
  harness.selectSupplier(supplier.id);
  harness.typePrice(String(price));
  harness.submitLine();
  await waitFor(() => {
    expect(harness.lineItemsBody.querySelector(`[data-book-id="${id}"]`)).toBeTruthy();
  });
}

describe('SPEC F11-TP2-003: Final removal resets draft + persist state', () => {
  test('confirming the last row removal clears draft inputs, focuses title, and disables Persist sale', async () => {
    const headerState = buildHeaderState(true);
    const harness = await createSalesLineItemsHarness({
      headerState,
      buildLineId: () => 'line-astro',
    });

    const supplier = { id: 'sup-1', name: 'Rare Reads' };
    harness.setSupplierOptions([supplier]);
    harness.persistBtn.disabled = false;

    await addLine(harness, {
      id: 'astro',
      title: 'Astrophysics 101',
      price: 500,
      supplier,
    });

    const row = harness.lineItemsBody.querySelector('[data-book-id="astro"]');
    const removeBtn = row.querySelector('button.sale-line-remove');
    fireEvent.click(removeBtn);
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(harness.lineItemsBody.querySelectorAll('.sale-line-row')).toHaveLength(0);
    });

    expect(harness.bookTitleInput.value).toBe('');
    expect(harness.bookIdInput.value).toBe('');
    expect(harness.selectedBookSummary.dataset.empty).toBe('true');
    expect(harness.supplierSelect.value).toBe('');
    expect(document.activeElement).toBe(harness.bookTitleInput);
    expect(harness.persistBtn.disabled).toBe(true);
  });
});
