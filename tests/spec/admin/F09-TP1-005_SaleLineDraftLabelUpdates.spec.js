import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

function buildReadyHeaderState() {
  return {
    isReady: () => true,
    onReadyChange(cb = () => {}) {
      cb(true);
      return () => {};
    },
  };
}

describe('SPEC F09-TP1-005: Draft label updates after book selection', () => {
  test('selecting a title updates the draft label and shifts focus to the price input', async () => {
    const harness = await createSalesLineItemsHarness({
      headerState: buildReadyHeaderState(),
    });

    harness.selectBook({
      id: 'book-90',
      title: 'Design Systems Handbook',
      supplier: { id: 'sup-7', name: 'Rare Reads' },
    });

    expect(harness.draftLabelEl.textContent).toMatch(/Selected: Design Systems Handbook/i);
    expect(document.activeElement).toBe(harness.priceInput);
    expect(harness.msgEl.textContent.toLowerCase()).toContain('book selected');
  });
});
