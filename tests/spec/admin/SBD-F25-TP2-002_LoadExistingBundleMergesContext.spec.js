import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { flushComposerPromises, loadInlineBundleComposer } from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP2-002: Loading an existing bundle merges context without duplicates', () => {
  test('Selecting an existing bundle hydrates fields, merges chips, and keeps ids unique', async () => {
    const loadBundle = jest.fn().mockResolvedValue({
      bundleName: 'Existing Bundle',
      bundlePriceMinor: 7500,
      bookIds: ['book-1', 'book-2'],
    });
    const harness = await loadInlineBundleComposer({
      adapters: {
        loadBundle,
        listExistingBundles: jest.fn().mockResolvedValue([
          { id: 'bundle-xyz', name: 'Existing Bundle', bookCount: 3 },
        ]),
      },
    });

    const { api, importError, mountError } = harness;
    const select = document.getElementById('inlineBundleExistingSelect');
    const nameInput = document.getElementById('inlineBundleName');
    const priceInput = document.getElementById('inlineBundlePrice');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api?.controller).toBeTruthy();

    api?.controller?.addBook({ id: 'book-2', title: 'Unsaved pick', salePriceMinor: 1100 });

    await flushComposerPromises();

    select.value = 'bundle-xyz';
    fireEvent.change(select);

    await flushComposerPromises();

    expect(loadBundle).toHaveBeenCalledWith('bundle-xyz');
    expect(nameInput?.value).toBe('Existing Bundle');
    expect(priceInput?.value).toBe('7500');

    const ids = api?.controller?.getState?.().books?.map((b) => b.id) || [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['book-1', 'book-2']));
  });
});
