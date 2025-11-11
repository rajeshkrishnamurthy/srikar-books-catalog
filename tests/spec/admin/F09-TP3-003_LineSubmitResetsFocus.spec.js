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

describe('SPEC F09-TP3-003: Draft reset refocuses the Book title input', () => {
  test('after a line is saved, the draft clears and focus returns to the title input for rapid entry', async () => {
    const headerState = buildHeaderState(true);
    const harness = await createSalesLineItemsHarness({
      headerState,
      buildLineId: () => 'line-focus',
    });

    harness.selectBook({
      id: 'book-45',
      title: 'Shape Up',
      supplier: { id: 'sup-4', name: 'Rare Reads' },
    });
    harness.typePrice('550');
    harness.submitLine();

    expect(document.activeElement).toBe(harness.bookTitleInput);
    expect(harness.bookTitleInput.value).toBe('');
    expect(harness.bookIdInput.value).toBe('');
    expect(harness.selectedBookSummary.dataset.empty).toBe('true');
  });
});
