import { describe, expect, test } from '@jest/globals';
import { createToastTestHarness } from '../../helpers/toastTestHarness.js';
import { createAdminCustomerHarness } from '../../../../tests/fixtures/adminCustomerHarness.js';

describe('SPEC SBD-F28-TP1-005: Customer save success shows toast', () => {
  test('saving a customer record raises a polite toast with the customer name and keeps focus on the form', async () => {
    const toast = createToastTestHarness();
    const harness = await createAdminCustomerHarness();

    harness.setField('customerName', 'Toast Customer');
    harness.setField('customerAddress', '123 Demo Street');
    harness.setField('customerLocation', 'Hyderabad');
    harness.setField('customerWhatsApp', '9876543210');
    harness.form.querySelector('#customerNameInput')?.focus();

    await harness.submit();

    expect(toast.showToast).toHaveBeenCalled();
    const payload = toast.showToast.mock.calls.at(-1)?.[0] || {};
    const message = (payload.message || '').toLowerCase();
    expect(message).toContain('toast customer');

    expect(toast.toastStack.children.length).toBeGreaterThan(0);
    const liveText = (toast.toastLiveRegion.textContent || '').toLowerCase();
    expect(liveText).toContain('toast customer');
    expect(toast.toastLiveRegion.getAttribute('aria-live')).toBe('polite');

    expect(harness.form.contains(document.activeElement)).toBe(true);

    toast.cleanup();
    document.body.innerHTML = '';
  });
});
