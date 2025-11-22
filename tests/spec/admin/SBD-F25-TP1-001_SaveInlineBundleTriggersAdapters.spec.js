import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import {
  createDeferred,
  flushComposerPromises,
  loadInlineBundleComposer,
} from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP1-001: Save inline bundle triggers adapters and busy state', () => {
  test('Clicking Save with valid fields calls saveBundle once and marks the composer busy while the promise resolves', async () => {
    const deferred = createDeferred();
    const harness = await loadInlineBundleComposer({
      adapters: {
        saveBundle: jest.fn(() => deferred.promise),
      },
    });

    const { api, adapters, importError, mountError } = harness;
    const composer = document.getElementById('inlineBundleComposer');
    const saveButton = document.getElementById('inlineBundleSave');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();
    expect(typeof api?.controller?.addBook).toBe('function');

    api?.controller?.addBook({ id: 'book-1', title: 'Spec Book', salePriceMinor: 2400 });
    api?.controller?.updateFields({ bundleName: '  Spec Bundle  ', bundlePriceMinor: 1999 });

    await flushComposerPromises();

    expect(saveButton?.disabled).toBe(false);

    fireEvent.click(saveButton);

    expect(adapters.saveBundle).toHaveBeenCalledTimes(1);
    expect(adapters.saveBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        bundleName: 'Spec Bundle',
        bundlePriceMinor: 1999,
        bookIds: ['book-1'],
      })
    );

    expect(composer?.getAttribute('aria-busy')).toBe('true');
    expect(saveButton?.disabled).toBe(true);

    deferred.resolve({ bundleId: 'bundle-123' });
    await flushComposerPromises();

    expect(composer?.getAttribute('aria-busy')).not.toBe('true');
  });
});
