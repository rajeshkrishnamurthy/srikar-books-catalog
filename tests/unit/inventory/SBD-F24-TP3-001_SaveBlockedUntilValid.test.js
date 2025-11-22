import { describe, expect, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP3-001: Save stays disabled until name and price validate', () => {
  test('saveBundle refuses empty name or price and returns validationErrors by field', async () => {
    const { controller, factory, adapters, importError } = await loadInlineBundleController();

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.updateFields).toBe('function');
    expect(typeof controller?.saveBundle).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    controller.addBook({ id: 'book-1', title: 'The Alchemist', salePriceMinor: 2500 });
    controller.updateFields({ bundleName: '   ', bundlePriceMinor: null });

    await controller.saveBundle();
    await flushPromises();

    expect(adapters.saveBundle).not.toHaveBeenCalled();

    const state = controller.getState();
    expect(state.validationErrors?.bundleName).toBeTruthy();
    expect(state.validationErrors?.bundlePrice).toBeTruthy();
    expect(state.isSaving === false || state.isSaving === undefined).toBe(true);
  });
});
