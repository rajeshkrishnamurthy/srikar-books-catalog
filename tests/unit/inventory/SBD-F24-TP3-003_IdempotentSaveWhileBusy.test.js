import { describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP3-003: Duplicate save requests are ignored while isSaving is true', () => {
  test('saveBundle is idempotent during in-flight calls and resets isSaving after resolve', async () => {
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    const { controller, factory, adapters, importError } = await loadInlineBundleController({
      adapters: {
        saveBundle: jest.fn().mockReturnValue(savePromise),
      },
    });

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.updateFields).toBe('function');
    expect(typeof controller?.saveBundle).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Invisible Cities', salePriceMinor: 2700 });
    controller.updateFields({ bundleName: 'Calvino Set', bundlePriceMinor: 2700 });

    const firstSave = controller.saveBundle();
    expect(controller.getState().isSaving).toBe(true);

    const secondSave = controller.saveBundle();
    expect(adapters.saveBundle).toHaveBeenCalledTimes(1);
    expect(firstSave).toBeInstanceOf(Promise);
    expect(secondSave).toBeInstanceOf(Promise);

    resolveSave({ bundleId: 'bundle-123' });
    await expect(firstSave).resolves.toEqual({ bundleId: 'bundle-123' });
    await flushPromises();

    expect(controller.getState().isSaving).toBe(false);
    expect(adapters.saveBundle).toHaveBeenCalledTimes(1);
  });
});
