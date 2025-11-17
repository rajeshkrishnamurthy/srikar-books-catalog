import { jest } from '@jest/globals';

export function buildAvailableAndSoldControllerFactory(
  availableController,
  soldController
) {
  let callCount = 0;
  return jest.fn((config = {}) => {
    callCount += 1;
    const controller = callCount === 1 ? availableController : soldController;
    controller.__config = config;
    if (typeof config?.onStateChange === 'function') {
      config.onStateChange();
    }
    return controller;
  });
}
