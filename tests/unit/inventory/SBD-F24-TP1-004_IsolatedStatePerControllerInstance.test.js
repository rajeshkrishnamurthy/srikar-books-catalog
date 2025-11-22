import { describe, expect, jest, test } from '@jest/globals';
import { loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP1-004: Default inline bundle state is isolated per controller instance', () => {
  test('reusing the factory after a prior selection starts with a clean default state', async () => {
    const firstLoad = await loadInlineBundleController();
    const { controller: firstController, factory, params, uiTexts, importError } = firstLoad;

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(firstController).toBeTruthy();
    expect(typeof firstController?.addBook).toBe('function');

    firstController.addBook({ id: 'book-1', title: 'First pick', salePriceMinor: 1200 });
    firstController.updateFields({ bundleName: 'First bundle', bundlePriceMinor: 1200 });

    const secondAdapters = {
      fetchPriceRecommendation: jest.fn(),
      loadBundle: jest.fn(),
      saveBundle: jest.fn(),
      persistDraft: jest.fn(),
      onStateChange: jest.fn(),
    };

    const secondController =
      typeof factory === 'function'
        ? factory({ params, adapters: secondAdapters, uiTexts, options: { debounceMs: 5 } })
        : null;

    expect(secondController).toBeTruthy();
    expect(typeof secondController?.getState).toBe('function');

    const secondState = secondController.getState();
    expect(secondState.books).toEqual([]);
    expect(secondState.bundleName).toBe('');
    expect(secondState.bundlePriceMinor).toBeNull();
    expect(secondState.validationErrors).toEqual({});
  });
});
