import { describe, expect, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP1-003: Reset clears inline bundle context but preserves session config', () => {
  test('reset() empties selections, clears pricing, and writes draft state', async () => {
    const { controller, factory, adapters, importError } = await loadInlineBundleController();

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.reset).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Atomic Habits', salePriceMinor: 2500 });
    controller.addBook({ id: 'book-2', title: 'Hooked', salePriceMinor: 3200 });

    controller.reset();
    await flushPromises();

    const state = controller.getState();
    expect(state.books).toEqual([]);
    expect(state.bundleName?.trim() || '').toBe('');
    expect(state.bundlePriceMinor === null || state.bundlePriceMinor === undefined).toBe(true);
    expect(state.recommendedPriceMinor).toBeNull();
    expect(state.totalSalePriceMinor ?? 0).toBe(0);
    expect(state.lastInteraction).toEqual(expect.any(Number));
    expect(adapters.onStateChange).toHaveBeenCalled();
    expect(adapters.persistDraft).toHaveBeenCalled();
  });
});
