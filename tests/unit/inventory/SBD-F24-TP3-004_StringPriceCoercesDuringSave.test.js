import { describe, expect, jest, test } from '@jest/globals';
import { flushPromises, loadInlineBundleController } from '../../fixtures/inlineBundleControllerHarness.js';

describe('SPEC SBD-F24-TP3-004: String bundle prices are coerced so saveBundle can proceed', () => {
  test('updateFields stores numeric strings as numbers and saveBundle forwards them', async () => {
    const { controller, adapters, factory, importError } = await loadInlineBundleController({
      adapters: {
        saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-200' }),
      },
    });

    expect(importError).toBeUndefined();
    expect(typeof factory).toBe('function');
    expect(controller).toBeTruthy();
    expect(typeof controller?.updateFields).toBe('function');
    expect(typeof controller?.saveBundle).toBe('function');

    controller.addBook({ id: 'book-5', title: 'Price Input', salePriceMinor: 1500 });
    controller.updateFields({ bundleName: 'Numeric string price', bundlePriceMinor: '8900' });

    await controller.saveBundle();
    await flushPromises();

    expect(adapters.saveBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        bundlePriceMinor: 8900,
      })
    );

    const state = controller.getState();
    expect(state.bundlePriceMinor).toBe(8900);
    expect(state.validationErrors).toEqual({});
  });
});
