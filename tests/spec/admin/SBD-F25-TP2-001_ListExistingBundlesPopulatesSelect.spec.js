import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import { flushComposerPromises, loadInlineBundleComposer } from '../../fixtures/inlineBundleComposerHarness.js';

describe('SPEC SBD-F25-TP2-001: Existing bundles populate the composer select', () => {
  test('listExistingBundles feeds the dropdown and Save relabels to Update after a selection', async () => {
    const harness = await loadInlineBundleComposer({
      adapters: {
        listExistingBundles: jest.fn().mockResolvedValue([
          { id: 'bundle-a', name: 'Summer Stack', bookCount: 2 },
          { id: 'bundle-b', name: 'Sale Picks', bookCount: 1 },
        ]),
      },
    });

    const { adapters, importError, mountError } = harness;
    const select = document.getElementById('inlineBundleExistingSelect');
    const saveButton = document.getElementById('inlineBundleSave');

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(adapters.listExistingBundles).toHaveBeenCalledTimes(1);

    await flushComposerPromises();

    const optionValues = Array.from(select?.options || []).map((opt) => opt.value);
    expect(optionValues).toEqual(expect.arrayContaining(['bundle-a', 'bundle-b']));

    select.value = 'bundle-b';
    fireEvent.change(select);
    await flushComposerPromises();

    expect(saveButton?.textContent || '').toMatch(/update bundle/i);
  });
});
