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

describe('SPEC F09-TP8-001: Selling price input strips non-numeric characters', () => {
  test('typing alpha characters is ignored so the field only keeps digits/decimal separator', async () => {
    const harness = await createSalesLineItemsHarness({
      headerState: buildHeaderState(true),
    });

    harness.typePrice('12abCD');

    expect(harness.priceInput.value).toBe('12');
  });
});
