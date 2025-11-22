import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { flushComposerPromises, loadInlineBundleComposer } from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP3-001: Success feedback keeps context until confirmed', () => {
  test('Success toast fires, view link adopts the bundle id, and chips remain until an explicit reset', async () => {
    const harness = await loadInlineBundleComposer({
      adapters: {
        saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-200' }),
        linkBooks: jest.fn().mockResolvedValue(),
        toastSuccess: jest.fn(),
      },
    });

    const { api, adapters, importError, mountError } = harness;
    const saveButton = document.getElementById('inlineBundleSave');
    const viewLink = document.getElementById('inlineBundleViewLink');
    const bookList = document.getElementById('inlineBundleSelectedBooks');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    api?.controller?.addBook({ id: 'book-1', title: 'Spec Shelf', salePriceMinor: 1800 });
    api?.controller?.updateFields({ bundleName: 'Spec Bundle', bundlePriceMinor: 4200 });

    await flushComposerPromises();

    expect(saveButton?.disabled).toBe(false);
    expect(viewLink?.hasAttribute('hidden')).toBe(true);

    fireEvent.click(saveButton);
    await flushComposerPromises();

    expect(adapters.toastSuccess).toHaveBeenCalled();
    expect(viewLink?.getAttribute('href') || '').toContain('bundle-200');
    expect(viewLink?.hasAttribute('hidden')).toBe(false);
    expect(bookList?.textContent || '').toContain('Spec Shelf');
  });
});
