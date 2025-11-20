import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { flushComposerPromises, loadInlineBundleComposer } from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP3-003: Analytics hooks fire for save outcomes', () => {
  test('Success and failure outcomes emit bundleCreatedInline and bundleCreateFailedInline analytics events', async () => {
    const track = jest.fn();
    const saveBundle = jest
      .fn()
      .mockResolvedValueOnce({ bundleId: 'bundle-analytics-1' })
      .mockRejectedValueOnce(Object.assign(new Error('permission-denied'), { code: 'permission-denied' }));

    const harness = await loadInlineBundleComposer({
      adapters: {
        saveBundle,
        toastSuccess: jest.fn(),
        toastError: jest.fn(),
      },
      options: {
        analytics: { track },
      },
    });

    const { api, importError, mountError } = harness;
    const saveButton = document.getElementById('inlineBundleSave');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    api?.controller?.addBook({ id: 'book-1', title: 'Analytics Book', salePriceMinor: 1900 });
    api?.controller?.updateFields({ bundleName: 'Analytics Bundle', bundlePriceMinor: 5100 });

    await flushComposerPromises();
    expect(saveButton?.disabled).toBe(false);

    fireEvent.click(saveButton);
    await flushComposerPromises();

    expect(track).toHaveBeenCalledWith(
      'bundleCreatedInline',
      expect.objectContaining({ bundleId: 'bundle-analytics-1', bookIds: ['book-1'] })
    );

    api?.controller?.updateFields({ bundlePriceMinor: 5200 });
    await flushComposerPromises();

    fireEvent.click(saveButton);
    await flushComposerPromises();

    expect(track).toHaveBeenCalledWith(
      'bundleCreateFailedInline',
      expect.objectContaining({ error: expect.anything() })
    );

    const events = track.mock.calls.map(([eventName]) => eventName);
    expect(events).toEqual(expect.arrayContaining(['bundleCreatedInline', 'bundleCreateFailedInline']));
  });
});
