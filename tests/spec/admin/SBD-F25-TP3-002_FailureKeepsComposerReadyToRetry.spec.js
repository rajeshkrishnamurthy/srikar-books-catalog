import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { flushComposerPromises, loadInlineBundleComposer } from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP3-002: Failure feedback keeps context intact for retry', () => {
  test('Failed save calls toastError, re-enables controls, and leaves selections untouched', async () => {
    const harness = await loadInlineBundleComposer({
      adapters: {
        saveBundle: jest.fn().mockRejectedValue(new Error('network-down')),
        toastError: jest.fn(),
      },
    });

    const { api, adapters, importError, mountError } = harness;
    const composer = document.getElementById('inlineBundleComposer');
    const saveButton = document.getElementById('inlineBundleSave');
    const bookList = document.getElementById('inlineBundleSelectedBooks');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    api?.controller?.addBook({ id: 'book-1', title: 'Spec Failure', salePriceMinor: 2400 });
    api?.controller?.updateFields({ bundleName: 'Spec Bundle', bundlePriceMinor: 3100 });

    await flushComposerPromises();
    expect(saveButton?.disabled).toBe(false);

    fireEvent.click(saveButton);
    await flushComposerPromises();

    expect(adapters.toastError).toHaveBeenCalled();
    expect(saveButton?.disabled).toBe(false);
    expect(composer?.getAttribute('aria-busy')).not.toBe('true');
    expect(bookList?.textContent || '').toContain('Spec Failure');
  });
});
