import { fireEvent, waitFor } from '@testing-library/dom';
import { jest } from '@jest/globals';
import { createSalesEntryPersistHarness } from '../../fixtures/salesEntryPersistHarness.js';

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
    expect(harness.lineItemsBody.querySelector(`[data-book-id=\"${id}\"]`)).toBeTruthy();
  });
}

function removeLine(row) {
  const removeBtn = row.querySelector('button.sale-line-remove');
  fireEvent.click(removeBtn);
  fireEvent.click(removeBtn);
}

describe('SPEC F11-TP3-002: Persist sale disables itself when no lines remain', () => {
  test('after removing the final line, Persist sale is disabled and clicking shows the guidance message', async () => {
    const addDocMock = jest.fn();
    const headerState = buildHeaderState(true);
    const harness = await createSalesEntryPersistHarness({
      headerState,
      addDocMock,
      buildLineId: () => 'line-astro',
    });

    const supplier = { id: 'sup-1', name: 'Rare Reads' };
    harness.setSupplierOptions([supplier]);

    await addLine(harness, { id: 'astro', title: 'Astrophysics 101', price: 500, supplier });

    const row = harness.lineItemsBody.querySelector('[data-book-id=\"astro\"]');
    removeLine(row);

    await waitFor(() => {
      expect(harness.lineItemsBody.querySelectorAll('.sale-line-row')).toHaveLength(0);
    });

    expect(harness.persistBtn.disabled).toBe(true);
    expect(harness.persistBtn.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(harness.persistBtn);

    expect(addDocMock).not.toHaveBeenCalled();
    expect(harness.persistMsg.textContent).toContain('Add at least one line item before saving');
  });
});
