import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import {
  createDeferred,
  flushComposerPromises,
  loadInlineBundleComposer,
} from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP1-003: Save ignores repeated taps while busy', () => {
  test('A second Save click during an in-flight request does not trigger duplicate adapter calls', async () => {
    const deferred = createDeferred();
    const harness = await loadInlineBundleComposer({
      adapters: {
        saveBundle: jest.fn(() => deferred.promise),
      },
    });

    const { api, adapters, importError, mountError } = harness;
    const saveButton = document.getElementById('inlineBundleSave');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();
    expect(typeof api?.controller?.addBook).toBe('function');

    api?.controller?.addBook({ id: 'book-1', title: 'Primary', salePriceMinor: 1500 });
    api?.controller?.updateFields({ bundleName: 'Spec Bundle', bundlePriceMinor: 3200 });

    await flushComposerPromises();
    expect(saveButton?.disabled).toBe(false);

    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(adapters.saveBundle).toHaveBeenCalledTimes(1);

    deferred.resolve({ bundleId: 'bundle-500' });
    await flushComposerPromises();

    expect(adapters.linkBooks).toHaveBeenCalledTimes(1);
    expect(adapters.linkBooks).toHaveBeenCalledWith('bundle-500', ['book-1']);
  });
});
