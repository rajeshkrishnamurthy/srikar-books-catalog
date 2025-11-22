import { fireEvent, waitFor } from '@testing-library/dom';
import { describe, expect, test, jest } from '@jest/globals';
import { createToastTestHarness } from '../../helpers/toastTestHarness.js';
import { createSalesEntryPersistHarness } from '../../../../tests/fixtures/salesEntryPersistHarness.js';

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
  harness.selectBook({ id, title, price, supplierId: supplier.id });
  harness.selectSupplier(supplier.id);
  harness.typePrice(String(price));
  await waitFor(() => {
    expect(harness.addLineBtn.disabled).toBe(false);
  });
  harness.submitLine();
  await waitFor(() => {
    expect(
      harness.lineItemsBody.querySelector(`[data-book-id=\"${id}\"]`)
    ).toBeTruthy();
  });
}

describe('SPEC SBD-F28-TP1-006: Sale persist success shows toast', () => {
  test('persisting a sale shows a polite toast summarizing saved line items without shifting focus', async () => {
    const toast = createToastTestHarness();
    const addDocMock = jest.fn(async () => ({ id: 'sale-toast' }));
    const headerState = buildHeaderState(true);
    const harness = await createSalesEntryPersistHarness({
      headerState,
      addDocMock,
    });
    const supplier = { id: 'sup-1', name: 'Toast Supplier' };

    harness.setSupplierOptions([supplier]);
    await addLine(harness, {
      id: 'line-toast',
      title: 'Toastable Book',
      price: 250,
      supplier,
    });

    fireEvent.click(harness.persistBtn);

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
    });

    expect(toast.showToast).toHaveBeenCalled();
    const payload = toast.showToast.mock.calls.at(-1)?.[0] || {};
    const message = (payload.message || '').toLowerCase();
    expect(message).toContain('saved');
    expect(message).toMatch(/line item/);

    expect(toast.toastStack.children.length).toBeGreaterThan(0);
    const liveText = (toast.toastLiveRegion.textContent || '').toLowerCase();
    expect(liveText).toContain('saved');
    expect(toast.toastLiveRegion.getAttribute('aria-live')).toBe('polite');

    expect(document.activeElement).toBe(harness.persistBtn);

    toast.cleanup();
    document.body.innerHTML = '';
  });
});
