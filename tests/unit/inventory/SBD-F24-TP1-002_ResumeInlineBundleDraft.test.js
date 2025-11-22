import { describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP1-002: Resume inline bundle draft when reopening composer', () => {
  test('setExistingBundle loads books/name/price and updates resumeBundleId', async () => {
    const restoredBundle = {
      bundleName: 'Weekend Picks',
      bundlePriceMinor: 7500,
      bookIds: ['book-1', 'book-2'],
    };

    const { controller, factory, adapters, importError } = await loadInlineBundleController({
      adapters: {
        loadBundle: jest.fn().mockResolvedValue(restoredBundle),
      },
    });

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.setExistingBundle).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    await controller.setExistingBundle('bundle-42');
    await flushPromises();

    expect(adapters.loadBundle).toHaveBeenCalledWith('bundle-42');

    const state = controller.getState();
    expect(state.resumeBundleId).toBe('bundle-42');
    expect(state.bundleName).toBe(restoredBundle.bundleName);
    expect(state.bundlePriceMinor).toBe(restoredBundle.bundlePriceMinor);
    expect(state.books?.map((b) => b.id)).toEqual(restoredBundle.bookIds);
    expect(state.lastInteraction).toEqual(expect.any(Number));
  });
});
