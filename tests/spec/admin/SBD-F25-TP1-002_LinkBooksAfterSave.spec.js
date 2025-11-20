import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { flushComposerPromises, loadInlineBundleComposer } from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP1-002: Save success links books and surfaces toast', () => {
  test('Save resolves then calls linkBooks with returned id, keeps chips, and toasts with the bundle name', async () => {
    const harness = await loadInlineBundleComposer({
      adapters: {
        saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-77' }),
        linkBooks: jest.fn().mockResolvedValue(),
        toastSuccess: jest.fn(),
      },
    });

    const { api, adapters, importError, mountError } = harness;
    const saveButton = document.getElementById('inlineBundleSave');
    const chipList = document.getElementById('inlineBundleSelectedBooks');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();
    expect(typeof api?.controller?.addBook).toBe('function');

    api?.controller?.addBook({ id: 'book-1', title: 'Spec One', salePriceMinor: 1200 });
    api?.controller?.addBook({ id: 'book-2', title: 'Spec Two', salePriceMinor: 1300 });
    api?.controller?.updateFields({ bundleName: 'Spec Bundle', bundlePriceMinor: 2500 });

    await flushComposerPromises();
    expect(saveButton?.disabled).toBe(false);

    fireEvent.click(saveButton);
    await flushComposerPromises();

    expect(adapters.saveBundle).toHaveBeenCalledTimes(1);
    expect(adapters.linkBooks).toHaveBeenCalledWith('bundle-77', ['book-1', 'book-2']);
    expect(adapters.linkBooks.mock.invocationCallOrder[0]).toBeGreaterThan(
      adapters.saveBundle.mock.invocationCallOrder[0]
    );
    expect(adapters.toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Spec Bundle'),
      expect.objectContaining({ bundleId: 'bundle-77' })
    );
    expect(chipList?.textContent || '').toContain('Spec One');
    expect(chipList?.textContent || '').toContain('Spec Two');
  });
});
