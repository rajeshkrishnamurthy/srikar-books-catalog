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

describe('SPEC F11-TP2-002: Totals recalculate after removal', () => {
  test('removing a line recomputes totals amount to match remaining lines', async () => {
    const headerState = buildHeaderState(true);
    const harness = await createSalesLineItemsHarness({
      headerState,
      buildLineId: (() => {
        let counter = 1;
        return () => `line-${counter++}`;
      })(),
    });

    const supplier = { id: 'sup-1', name: 'Rare Reads' };
    harness.setSupplierOptions([supplier]);

    await addLine(harness, {
      id: 'astro',
      title: 'Astrophysics 101',
      price: 500,
      supplier,
    });
    await addLine(harness, {
      id: 'poetry',
      title: 'Poems of the Sun',
      price: 750,
      supplier,
    });

    expect(harness.totalsAmountEl.textContent).toBe('₹1250.00');

    const astroRow = harness.lineItemsBody.querySelector('[data-book-id="astro"]');
    const astroRemove = astroRow.querySelector('button.sale-line-remove');
    fireEvent.click(astroRemove);
    fireEvent.click(astroRemove); // confirm

    await waitFor(() => {
      expect(harness.lineItemsBody.querySelectorAll('.sale-line-row')).toHaveLength(1);
    });

    expect(harness.totalsAmountEl.textContent).toBe('₹750.00');
    expect(harness.totalsCountEl.textContent).toBe('Order total');
  });
});
