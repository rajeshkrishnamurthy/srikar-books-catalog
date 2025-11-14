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

describe('SPEC F11-TP3-003: Persist status announces saved count', () => {
  test('saving two lines announces the total count in the aria-live persist message', async () => {
    const addDocMock = jest.fn(async () => ({ id: 'sale-xyz' }));
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

    fireEvent.click(harness.persistBtn);

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(harness.persistMsg.textContent).toMatch(/Saved 2 line items/i);
    });
    expect(harness.statusList.childElementCount).toBe(2);
    Array.from(harness.statusList.children).forEach((item) => {
      expect(item.dataset.state).toBe('success');
    });
  });
});
