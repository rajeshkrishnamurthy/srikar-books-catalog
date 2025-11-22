import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP2-002: Recommendation results update controller state and shell listeners', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('controller streams recommendedPriceMinor and totalSalePriceMinor after adapter resolves', async () => {
    const { controller, factory, adapters, importError } = await loadInlineBundleController({
      adapters: {
        fetchPriceRecommendation: jest
          .fn()
          .mockResolvedValue({ recommendedPriceMinor: 9900, totalSalePriceMinor: 8400 }),
      },
    });

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Project Hail Mary', salePriceMinor: 4200 });
    controller.addBook({ id: 'book-2', title: 'The Martian', salePriceMinor: 3800 });

    jest.runAllTimers();
    await flushPromises();

    const state = controller.getState();
    expect(state.recommendedPriceMinor).toBe(9900);
    expect(state.totalSalePriceMinor).toBe(8400);
    expect(state.lastInteraction).toEqual(expect.any(Number));
    expect(adapters.onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ recommendedPriceMinor: 9900, totalSalePriceMinor: 8400 })
    );
  });
});
