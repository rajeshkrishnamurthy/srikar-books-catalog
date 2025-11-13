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

describe('SPEC F09-TP8-002: Selling price rejects negative values with positive-number guidance', () => {
  test('submitting a negative price shows positive-number validation and does not add the line', async () => {
    const harness = await createSalesLineItemsHarness({
      headerState: buildHeaderState(true),
    });

    harness.selectBook({
      id: 'book-87',
      title: 'Shape Up',
      supplier: { id: 'sup-12', name: 'North Star', location: 'Mumbai' },
    });
    harness.typePrice('-250');
    harness.submitLine();

    expect(harness.lineItemsBody.children).toHaveLength(0);
    expect(harness.msgEl.textContent.toLowerCase()).toContain('positive');
  });
});
