import { describe, expect, test } from '@jest/globals';
import { createToastTestHarness } from '../../helpers/toastTestHarness.js';
import { createAdminSupplierHarness } from '../../../../tests/fixtures/adminSupplierHarness.js';

describe('SPEC SBD-F28-TP1-004: Supplier save success shows toast', () => {
  test('adding or updating a supplier fires a success toast with the supplier name and preserves form focus', async () => {
    const toast = createToastTestHarness();
    const harness = await createAdminSupplierHarness();

    harness.setField('supplierName', 'Toast Supplier');
    harness.setField('supplierLocation', 'Hyderabad');
    harness.form.querySelector('#supplierNameInput')?.focus();

    await harness.submit();

    expect(toast.showToast).toHaveBeenCalled();
    const payload = toast.showToast.mock.calls.at(-1)?.[0] || {};
    const message = (payload.message || '').toLowerCase();
    expect(message).toContain('toast supplier');

    expect(toast.toastStack.children.length).toBeGreaterThan(0);
    const liveText = (toast.toastLiveRegion.textContent || '').toLowerCase();
    expect(liveText).toContain('toast supplier');
    expect(toast.toastLiveRegion.getAttribute('aria-live')).toBe('polite');

    expect(harness.form.contains(document.activeElement)).toBe(true);

    toast.cleanup();
    document.body.innerHTML = '';
  });
});
