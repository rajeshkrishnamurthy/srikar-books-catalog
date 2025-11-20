import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP2-003: Recommendation clears when below threshold or adapter rejects', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('adapter rejection or drop below threshold clears recommendedPriceMinor without spamming adapter', async () => {
    const { controller, factory, adapters, importError } = await loadInlineBundleController({
      adapters: {
        fetchPriceRecommendation: jest.fn().mockRejectedValue(new Error('no recommendation')),
      },
    });

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.removeBook).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Foundation', salePriceMinor: 3500 });
    controller.addBook({ id: 'book-2', title: 'The Expanse', salePriceMinor: 3700 });

    jest.runAllTimers();
    await flushPromises();

    expect(adapters.fetchPriceRecommendation).toHaveBeenCalledTimes(1);
    const afterRecommendation = controller.getState();
    expect(afterRecommendation.recommendedPriceMinor).toBeNull();
    expect(afterRecommendation.lastInteraction).toEqual(expect.any(Number));

    controller.removeBook('book-2');
    jest.runAllTimers();
    await flushPromises();

    expect(adapters.fetchPriceRecommendation).toHaveBeenCalledTimes(1);
    const afterDrop = controller.getState();
    expect(afterDrop.books?.map((b) => b.id)).toEqual(['book-1']);
    expect(afterDrop.recommendedPriceMinor).toBeNull();
  });
});
