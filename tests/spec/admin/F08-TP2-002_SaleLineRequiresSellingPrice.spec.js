import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

describe('SPEC F08-TP2-002: Sale line requires selling price', () => {
  test('adding a line without price shows inline validation and blocks submission', async () => {
    const harness = await createSalesLineItemsHarness();
    harness.selectBook({
      id: 'book-22',
      title: 'System Design Playbook',
      supplier: {
        id: 'sup-9',
        name: 'Prime Books',
        location: 'Hyderabad',
      },
    });

    harness.submitLine();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('price');
    expect(harness.lineItemsBody.children).toHaveLength(0);
    expect(harness.addLineBtn.disabled).toBe(true);
    expect(harness.onLinesChange).not.toHaveBeenCalled();
  });
});
