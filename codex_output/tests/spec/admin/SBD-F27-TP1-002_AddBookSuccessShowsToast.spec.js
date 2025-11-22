import { describe, expect, test } from '@jest/globals';
import { createAddBookToastHarness } from '../../helpers/adminAddToastHarness.js';

describe('SPEC SBD-F27-TP1-002: Add Book success shows toast', () => {
  test('Successful add uses toast pattern to show a polite success message with the title', async () => {
    const harness = await createAddBookToastHarness();
    const supplierSelect = harness.addForm?.elements?.supplierId;
    supplierSelect?.focus?.();

    await harness.submitAddForm();

    const stack = harness.toastStack;
    const liveRegion = harness.toastLiveRegion;

    expect(stack).toBeTruthy();
    expect(stack.children.length).toBeGreaterThan(0);

    const toast = stack.firstElementChild;
    const toastText = (toast?.textContent || '').toLowerCase();

    expect(toastText).toContain('book');
    expect(toastText).toContain('test title');
    expect(toastText).toMatch(/added|success/);

    const liveRegionText = (liveRegion?.textContent || '').toLowerCase();
    expect(liveRegionText).toContain('book');
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');

    expect(document.activeElement).toBe(supplierSelect || harness.addForm);

    harness.cleanup?.();
  });
});
