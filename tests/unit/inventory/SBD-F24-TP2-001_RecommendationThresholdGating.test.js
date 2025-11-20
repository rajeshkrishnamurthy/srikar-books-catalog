import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP2-001: Price recommendations gated by selection threshold', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('fetchPriceRecommendation fires only after reaching recommendationThreshold', async () => {
    const { controller, factory, adapters, importError, params } = await loadInlineBundleController();

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Dune', salePriceMinor: 4500 });
    jest.runAllTimers();
    await flushPromises();

    expect(adapters.fetchPriceRecommendation).not.toHaveBeenCalled();

    controller.addBook({ id: 'book-2', title: 'Neuromancer', salePriceMinor: 3900 });
    jest.runAllTimers();
    await flushPromises();

    expect(adapters.fetchPriceRecommendation).toHaveBeenCalledWith({
      bookIds: ['book-1', 'book-2'],
      currency: params.currency,
    });
  });
});
