import { waitFor } from '@testing-library/dom';
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

describe('SPEC F11-TP1-001: Each sale line renders an accessible Remove control', () => {
  test('two added lines each expose a Remove button with aria-label referencing the title', async () => {
    const headerState = buildHeaderState(true);
    const lineIds = ['line-astro', 'line-poetry'];
    const harness = await createSalesLineItemsHarness({
      headerState,
      buildLineId: () => lineIds.shift() || `line-${Date.now()}`,
    });

    const supplier = { id: 'sup-1', name: 'Rare Reads', location: 'Hyd' };
    harness.setSupplierOptions([supplier]);

    await addLine(harness, {
      book: { id: 'astro', title: 'Astrophysics 101' },
      supplier,
    });
    await addLine(harness, {
      book: { id: 'poetry', title: 'Poems of the Sun' },
      supplier,
    });

    await waitFor(() => {
      expect(harness.lineItemsBody.querySelectorAll('.sale-line-row')).toHaveLength(2);
    });

    const astroRow = harness.lineItemsBody.querySelector('[data-line-id="line-astro"]');
    const poetryRow = harness.lineItemsBody.querySelector('[data-line-id="line-poetry"]');

    expect(astroRow).not.toBeNull();
    expect(poetryRow).not.toBeNull();

    [astroRow, poetryRow].forEach((row) => {
      const removeBtn = row.querySelector('button.sale-line-remove');
      expect(removeBtn).not.toBeNull();
      expect(removeBtn.textContent.toLowerCase()).toContain('remove');
      const title = row.querySelector('.sale-line-book__title')?.textContent?.trim();
      expect(removeBtn.getAttribute('aria-label') || '').toContain(title);
      expect(removeBtn.tabIndex).not.toBe(-1);
    });
  });
});
