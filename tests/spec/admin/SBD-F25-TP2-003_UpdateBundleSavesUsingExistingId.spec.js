import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { flushComposerPromises, loadInlineBundleComposer } from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP2-003: Continuing a bundle saves with the existing id', () => {
  test('Save payload for an existing bundle carries the bundleId and merged book ids', async () => {
    const saveBundle = jest.fn().mockResolvedValue({ bundleId: 'bundle-xyz' });
    const loadBundle = jest.fn().mockResolvedValue({
      bundleName: 'Existing Bundle',
      bundlePriceMinor: 5000,
      bookIds: ['book-1'],
    });
    const harness = await loadInlineBundleComposer({
      adapters: {
        saveBundle,
        loadBundle,
        listExistingBundles: jest.fn().mockResolvedValue([
          { id: 'bundle-xyz', name: 'Existing Bundle', bookCount: 1 },
        ]),
      },
    });

    const { api, importError, mountError } = harness;
    const select = document.getElementById('inlineBundleExistingSelect');
    const saveButton = document.getElementById('inlineBundleSave');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    api?.controller?.addBook({ id: 'book-2', title: 'New pick', salePriceMinor: 1300 });

    await flushComposerPromises();

    select.value = 'bundle-xyz';
    fireEvent.change(select);
    await flushComposerPromises();

    expect(saveButton?.textContent || '').toMatch(/update bundle/i);

    fireEvent.click(saveButton);
    await flushComposerPromises();

    expect(saveBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        bundleId: 'bundle-xyz',
        bundleName: 'Existing Bundle',
        bundlePriceMinor: 5000,
        bookIds: expect.arrayContaining(['book-1', 'book-2']),
      })
    );
  });
});
