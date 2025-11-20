import { describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP3-002: Valid fields clear errors and emit clean payload', () => {
  test('trimmed bundleName and positive price allow saveBundle and clear validationErrors', async () => {
    const { controller, factory, adapters, importError } = await loadInlineBundleController({
      adapters: {
        saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-99' }),
      },
    });

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.addBook).toBe('function');
    expect(typeof controller?.updateFields).toBe('function');
    expect(typeof controller?.saveBundle).toBe('function');
    expect(typeof controller?.getState).toBe('function');

    controller.addBook({ id: 'book-1', title: 'Atomic Habits', salePriceMinor: 2500 });
    controller.addBook({ id: 'book-2', title: 'Deep Work', salePriceMinor: 3000 });
    controller.updateFields({ bundleName: '  Summer Reads  ', bundlePriceMinor: 9900 });

    await controller.saveBundle();
    await flushPromises();

    expect(adapters.saveBundle).toHaveBeenCalledWith({
      bundleId: expect.any(String),
      bundleName: 'Summer Reads',
      bundlePriceMinor: 9900,
      bookIds: ['book-1', 'book-2'],
    });

    const state = controller.getState();
    expect(state.validationErrors).toEqual({});
    expect(state.isSaving === false || state.isSaving === undefined).toBe(true);
  });
});
