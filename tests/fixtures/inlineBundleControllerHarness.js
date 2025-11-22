import { jest } from '@jest/globals';

const controllerModuleUrl = new URL('../../src/ui/patterns/inline-bundle-composer-controller/index.js', import.meta.url);

export async function loadInlineBundleController(options = {}) {
  jest.resetModules();
  jest.clearAllMocks();

  let moduleRef;
  let importError;

  try {
    moduleRef = await import(controllerModuleUrl.href);
  } catch (error) {
    importError = error;
  }

  const factory = moduleRef?.createInlineBundleComposerController || moduleRef?.default;

  const adapters = {
    fetchPriceRecommendation: jest
      .fn()
      .mockResolvedValue({ recommendedPriceMinor: 0, totalSalePriceMinor: 0 }),
    loadBundle: jest.fn(),
    saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-1' }),
    persistDraft: jest.fn(),
    onStateChange: jest.fn(),
    ...options.adapters,
  };

  const params = {
    currency: 'INR',
    pricePrecision: 2,
    recommendationThreshold: 2,
    persistSessionKey: 'availableBooksInlineBundle',
    maxBooks: 10,
    ...options.params,
  };

  const uiTexts = {
    defaultBundleNamePrefix: 'Bundle from Available Books',
    pricePlaceholder: 'Enter bundle price',
    recommendedPendingCopy: 'Add one more book to see a recommended price',
    ...options.uiTexts,
  };

  const controller =
    typeof factory === 'function'
      ? factory({
          params,
          adapters,
          uiTexts,
          options: { debounceMs: 25, ...(options.options || {}) },
        })
      : null;

  return { controller, factory, adapters, params, uiTexts, importError };
}

export async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
