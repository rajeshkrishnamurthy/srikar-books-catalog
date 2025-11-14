import { createSalesHeaderHarness } from '../../fixtures/salesHeaderHarness.js';

describe('SPEC F08-TP1-001: Sale header requires customer selection', () => {
  test('customer lookup selection populates summary and hidden field', async () => {
    const harness = await createSalesHeaderHarness();
    harness.selectCustomer({
      id: 'cust-42',
      name: 'Anil Rao',
      location: 'Bengaluru',
      whatsApp: '+91 99999 88888',
    });

    expect(harness.customerIdInput.value).toBe('cust-42');
    expect(harness.customerSummary.textContent).toContain('Anil Rao');
    expect(harness.customerSummary.textContent).toContain('Bengaluru');
    expect(harness.customerSummary.dataset.empty).toBe('false');
  });

  test('submitting without a customer surfaces inline error and blocks continuation', async () => {
    const harness = await createSalesHeaderHarness();
    harness.setSaleDate('10-Feb-24');
    harness.submit();

    expect(harness.msgEl.textContent.toLowerCase()).toContain('customer');
    expect(harness.onHeaderReady).not.toHaveBeenCalled();
  });
});
