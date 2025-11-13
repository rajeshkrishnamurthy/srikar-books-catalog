import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

function buildHeaderState(initialReady = false) {
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

describe('SPEC F09-TP3-001: Draft form locked until header is valid', () => {
  test('book title input, price field, and add button stay disabled with Add another book label', async () => {
    const headerState = buildHeaderState(false);
    const harness = await createSalesLineItemsHarness({ headerState });

    expect(harness.draftForm.dataset.locked).toBe('true');
    expect(harness.bookTitleInput.disabled).toBe(true);
    expect(harness.priceInput.disabled).toBe(true);
    expect(harness.addLineBtn.disabled).toBe(true);
    expect(harness.draftLabelEl.textContent).toMatch(/Add another book/i);
  });
});
