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

describe('SPEC F09-TP3-002: Unlock draft when header becomes valid', () => {
  test('header ready state gates the Submit button even when book + price exist', async () => {
    const headerState = buildHeaderState(false);
    const harness = await createSalesLineItemsHarness({ headerState });
    const book = {
      id: 'book-81',
      title: 'Working in Public',
      supplier: { id: 'sup-1', name: 'Shelf Life' },
    };

    harness.selectBook(book);
    harness.typePrice('450');

    expect(harness.addLineBtn.disabled).toBe(true);
    expect(harness.bookTitleInput.disabled).toBe(true);

    headerState.setReady(true);
    await Promise.resolve();

    expect(harness.bookTitleInput.disabled).toBe(false);
    expect(harness.priceInput.disabled).toBe(false);
    expect(harness.addLineBtn.disabled).toBe(false);
  });
});
