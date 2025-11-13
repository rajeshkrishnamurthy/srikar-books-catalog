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

describe('SPEC F09-TP3-004: Header reset relocks the draft row', () => {
  test('toggling header back to invalid state disables controls and surfaces guidance', async () => {
    const headerState = buildHeaderState(true);
    const harness = await createSalesLineItemsHarness({ headerState });

    harness.selectBook({ id: 'book-9', title: 'Atomic Habits' });
    harness.typePrice('400');
    headerState.setReady(false);
    await Promise.resolve();

    expect(harness.draftForm.dataset.locked).toBe('true');
    expect(harness.bookTitleInput.disabled).toBe(true);
    expect(harness.priceInput.disabled).toBe(true);
    expect(harness.addLineBtn.disabled).toBe(true);
    expect(harness.selectedBookSummary.dataset.empty).toBe('true');
  });
});
