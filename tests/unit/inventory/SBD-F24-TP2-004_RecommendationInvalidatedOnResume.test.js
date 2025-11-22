import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP2-004: Resuming a bundle cancels stale recommendation requests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('setExistingBundle clears any pending recommendation timer/request before emitting state', async () => {
    const { controller, adapters, factory, importError } = await loadInlineBundleController({
      adapters: {
        fetchPriceRecommendation: jest
          .fn()
          .mockResolvedValue({ recommendedPriceMinor: 2222, totalSalePriceMinor: 2222 }),
        loadBundle: jest.fn().mockResolvedValue({
          bundleName: 'Restored Bundle',
          bundlePriceMinor: 4500,
          bookIds: ['book-restored'],
        }),
      },
    });

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.setExistingBundle).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Dune', salePriceMinor: 4500 });
    controller.addBook({ id: 'book-2', title: 'Hyperion', salePriceMinor: 3800 });

    expect(adapters.fetchPriceRecommendation).not.toHaveBeenCalled();

    await controller.setExistingBundle('bundle-resume');
    jest.runAllTimers();
    await flushPromises();

    const state = controller.getState();
    expect(state.resumeBundleId).toBe('bundle-resume');
    expect(state.books?.map((b) => b.id)).toEqual(['book-restored']);
    expect(adapters.fetchPriceRecommendation).not.toHaveBeenCalled();
    expect(state.recommendedPriceMinor).toBeNull();
    expect(state.totalSalePriceMinor ?? 0).toBe(0);
  });
});
