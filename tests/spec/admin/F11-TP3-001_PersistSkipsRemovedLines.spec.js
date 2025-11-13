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

describe('SPEC F11-TP3-001: Persist skips removed lines', () => {
  test('removed lineIds never appear in the persisted Firestore payload or status list', async () => {
    const addDocMock = jest.fn(async () => ({ id: 'sale-123' }));
    const headerState = buildHeaderState(true);
    const harness = await createSalesEntryPersistHarness({
      headerState,
      addDocMock,
      buildLineId: (() => {
        let counter = 1;
        return () => `line-${counter++}`;
      })(),
    });

    const supplier = { id: 'sup-1', name: 'Rare Reads' };
    harness.setSupplierOptions([supplier]);

    await addLine(harness, { id: 'astro', title: 'Astrophysics 101', price: 500, supplier });
    await addLine(harness, { id: 'poems', title: 'Poems of the Sun', price: 750, supplier });

    const astroRow = harness.lineItemsBody.querySelector('[data-book-id=\"astro\"]');
    removeLine(astroRow);

    await waitFor(() => {
      expect(harness.lineItemsBody.querySelectorAll('.sale-line-row')).toHaveLength(1);
    });

    fireEvent.click(harness.persistBtn);

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
    });

    const payload = addDocMock.mock.calls[0][1];
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0].bookId).toBe('poems');

    expect(harness.statusList.childElementCount).toBe(1);
    expect(harness.statusList.textContent).toContain('Poems of the Sun');
    expect(harness.statusList.textContent).not.toContain('Astrophysics 101');
  });
});
