import { describe, expect, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP1-001: First selection spawns inline bundle context', () => {
  test('addBook initializes bundle state, keeps ids unique, and emits state change', async () => {
    const { controller, factory, adapters, importError } = await loadInlineBundleController();

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Zero to One', salePriceMinor: 3000 });
    controller.addBook({ id: 'book-1', title: 'Zero to One', salePriceMinor: 3000 });

    const state = controller.getState();
    expect(state.bundleId).toBeTruthy();
    expect(state.books?.map((b) => b.id)).toEqual(['book-1']);
    expect(state.lastInteraction).toEqual(expect.any(Number));
    expect(adapters.onStateChange).toHaveBeenCalledWith(expect.objectContaining({ bundleId: expect.any(String) }));
  });
});
