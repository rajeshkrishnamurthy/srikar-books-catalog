import { describe, expect, test } from '@jest/globals';
import { createToastTestHarness } from '../../helpers/toastTestHarness.js';
import { createAdminEditHarness } from '../../../../tests/fixtures/adminEditHarness.js';

describe('SPEC SBD-F28-TP1-002: Edit save success shows toast', () => {
  test('successful edit submit renders a polite toast with the book title and keeps dialog focus', async () => {
    const toast = createToastTestHarness();
    const harness = await createAdminEditHarness();

    harness.setSupplierOptions([{ id: 'sup-1', name: 'Supplier One' }]);
    await harness.open('book-123', {
      title: 'Edited Toast Book',
      supplierId: 'sup-1',
    });
    const focusTarget = harness.form.elements['etitle'];
    focusTarget?.focus();

    await harness.submit();

    expect(toast.showToast).toHaveBeenCalled();
    const payload = toast.showToast.mock.calls.at(-1)?.[0] || {};
    const message = (payload.message || '').toLowerCase();
    expect(message).toContain('edited toast book');
    expect(payload.variant || 'success').toBe('success');

    expect(toast.toastStack.children.length).toBeGreaterThan(0);
    const liveText = (toast.toastLiveRegion.textContent || '').toLowerCase();
    expect(liveText).toContain('edited toast book');
    expect(toast.toastLiveRegion.getAttribute('aria-live')).toBe('polite');

    expect(harness.dialog.contains(document.activeElement)).toBe(true);

    toast.cleanup();
    document.body.innerHTML = '';
  });
});
