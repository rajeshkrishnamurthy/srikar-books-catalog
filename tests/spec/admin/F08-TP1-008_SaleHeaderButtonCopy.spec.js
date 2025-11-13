import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F08-TP1-007: Sale header button copy and success message', () => {
  test('primary CTA reads Add books and success copy matches “Header saved—add books below”', async () => {
    const harness = await createSalesHeaderHarness();
    expect(harness.continueBtn.textContent).toMatch(/Add books/i);

    harness.selectCustomer({
      id: 'cust-21',
      name: 'Nisha',
      location: 'Hyderabad',
    });
    harness.setSaleDate('10-Feb-24');
    harness.submit();

    expect(harness.msgEl.textContent).toMatch(/Header saved—add books below/i);
    expect(harness.continueBtn.disabled).toBe(true);
  });
});
