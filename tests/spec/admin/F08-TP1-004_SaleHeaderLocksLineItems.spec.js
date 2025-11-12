import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F08-TP1-004: Sale header gates access to line items', () => {
  test('continue button stays disabled until both customer and date are set', async () => {
    const harness = await createSalesHeaderHarness();
    expect(harness.continueBtn.disabled).toBe(true);

    harness.selectCustomer({ id: 'cust-9', name: 'Asha Rao' });
    expect(harness.continueBtn.disabled).toBe(true);

    harness.setSaleDate('01-Apr-24');
    expect(harness.continueBtn.disabled).toBe(false);
  });

  test('after emitting header payload, form locks to prevent duplicate submissions until reset', async () => {
    const harness = await createSalesHeaderHarness();
    harness.selectCustomer({ id: 'cust-9', name: 'Asha Rao' });
    harness.setSaleDate('01-Apr-24');

    harness.submit();
    expect(harness.onHeaderReady).toHaveBeenCalledTimes(1);
    expect(harness.continueBtn.disabled).toBe(true);
    expect(harness.customerIdInput.value).toBe('');
    expect(harness.customerSummary.dataset.empty).toBe('true');
  });
});
