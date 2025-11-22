import { describe, expect, test } from '@jest/globals';
import { createToastTestHarness } from '../../helpers/toastTestHarness.js';
import { createBundleHarness } from '../../../../tests/fixtures/adminBundleHarness.js';

describe('SPEC SBD-F28-TP1-003: Bundle create success shows toast', () => {
  test('creating a bundle emits a toast with the bundle title and leaves focus on the form', async () => {
    const toast = createToastTestHarness();
    const harness = await createBundleHarness();
    const supplier = { id: 'sup-lock', name: 'Toast Supplier', location: 'HYD' };

    harness.setSupplierOptions([supplier]);
    harness.setSupplier(supplier.id);
    expect(harness.isSupplierLocked()).toBe(true);

    harness.emitBookSelection({
      id: 'book-1',
      title: 'Toast Book One',
      price: 120,
      supplierId: supplier.id,
    });
    harness.emitBookSelection({
      id: 'book-2',
      title: 'Toast Book Two',
      price: 130,
      supplierId: supplier.id,
    });
    harness.setTitle('Bundle Toast Title');
    harness.setPrice('150');

    const priceInput = harness.form.querySelector('#bundlePriceInput');
    priceInput?.focus();

    await harness.submit();

    expect(toast.showToast).toHaveBeenCalled();
    const payload = toast.showToast.mock.calls.at(-1)?.[0] || {};
    const message = (payload.message || '').toLowerCase();
    expect(message).toContain('bundle toast title');

    expect(toast.toastStack.children.length).toBeGreaterThan(0);
    const liveText = (toast.toastLiveRegion.textContent || '').toLowerCase();
    expect(liveText).toContain('bundle');
    expect(toast.toastLiveRegion.getAttribute('aria-live')).toBe('polite');

    expect(harness.form.contains(document.activeElement)).toBe(true);

    toast.cleanup();
    document.body.innerHTML = '';
  });
});
