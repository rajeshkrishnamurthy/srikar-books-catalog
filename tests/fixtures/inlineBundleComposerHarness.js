import { jest } from '@jest/globals';

const composerModuleUrl = new URL(
  '../../src/ui/patterns/inline-bundle-composer/index.js',
  import.meta.url
);

function buildDom(domSource) {
  if (typeof domSource === 'string' && domSource.trim()) {
    if (typeof DOMParser === 'function') {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(domSource, 'text/html');
      parsed.querySelectorAll('script').forEach((node) => node.remove());
      document.body.innerHTML = parsed.body?.innerHTML || domSource;
    } else {
      document.body.innerHTML = domSource;
    }
  } else {
    document.body.innerHTML = `
      <section
        id="inlineBundleComposer"
        role="region"
        aria-labelledby="inlineBundleHeading"
        hidden
      >
        <header class="inline-bundle-composer__header">
          <h3 id="inlineBundleHeading" tabindex="-1">Bundle in progress</h3>
        </header>
        <p id="inlineBundleEmptyState">Add a book to start a bundle</p>
        <div id="inlineBundleSelectedBooks" role="list"></div>
        <div class="inline-bundle-composer__form">
          <label for="inlineBundleName">Bundle name</label>
          <input id="inlineBundleName" type="text" aria-describedby="inlineBundleHelper" />
          <label for="inlineBundlePrice">Bundle price</label>
          <input id="inlineBundlePrice" type="number" aria-describedby="inlineBundleHelper" />
          <label class="sr-only" for="inlineBundleExistingSelect">Continue existing bundle</label>
          <select id="inlineBundleExistingSelect"></select>
        </div>
        <dl class="inline-bundle-composer__totals">
          <div>
            <dt>Recommended price</dt>
            <dd id="inlineBundleRecommended" aria-live="polite">—</dd>
          </div>
          <div>
            <dt>Total sale price</dt>
            <dd id="inlineBundleTotal" aria-live="polite">—</dd>
          </div>
        </dl>
        <a id="inlineBundleViewLink" data-test="inlineBundleViewLink" href="#" hidden>View bundle</a>
        <p id="inlineBundleHelper" class="inline-bundle-composer__helper">
          Bundle name and bundle price are required before saving.
        </p>
        <footer class="inline-bundle-composer__actions">
          <button id="inlineBundleReset" type="button">Clear bundle</button>
          <button id="inlineBundleSave" type="button" disabled>Save bundle</button>
        </footer>
      </section>
      <button
        type="button"
        data-test="bookAddToBundle"
        aria-controls="inlineBundleComposer"
        aria-expanded="false"
        aria-pressed="false"
      >
        Add to bundle
      </button>
    `;
  }

  const container = document.getElementById('inlineBundleComposer');
  return {
    container,
    heading: document.getElementById('inlineBundleHeading'),
    bookList: document.getElementById('inlineBundleSelectedBooks'),
    emptyState: document.getElementById('inlineBundleEmptyState'),
    bundleNameInput: document.getElementById('inlineBundleName'),
    bundlePriceInput: document.getElementById('inlineBundlePrice'),
    saveButton: document.getElementById('inlineBundleSave'),
    resetButton: document.getElementById('inlineBundleReset'),
    existingBundleSelect: document.getElementById('inlineBundleExistingSelect'),
    recommendedPrice: document.getElementById('inlineBundleRecommended'),
    totalPrice: document.getElementById('inlineBundleTotal'),
    viewLink: document.getElementById('inlineBundleViewLink'),
    helper: document.getElementById('inlineBundleHelper'),
    trigger: document.querySelector("[data-test='bookAddToBundle']"),
  };
}

function buildAdapters(overrides = {}) {
  return {
    fetchPriceRecommendation: jest.fn().mockResolvedValue({
      recommendedPriceMinor: 0,
      totalSalePriceMinor: 0,
    }),
    loadBundle: jest.fn(),
    listExistingBundles: jest.fn().mockResolvedValue([]),
    saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-1' }),
    linkBooks: jest.fn().mockResolvedValue(),
    formatPrice: jest.fn((value, currency) => `${currency} ${value}`),
    toastSuccess: jest.fn(),
    toastError: jest.fn(),
    announce: jest.fn(),
    ...overrides,
  };
}

const DEFAULT_PARAMS = {
  container: '#inlineBundleComposer',
  panelHeading: '#inlineBundleHeading',
  triggerSelector: "[data-test='bookAddToBundle']",
  bookList: '#inlineBundleSelectedBooks',
  bundleNameInput: '#inlineBundleName',
  bundlePriceInput: '#inlineBundlePrice',
  recommendedPrice: '#inlineBundleRecommended',
  totalPrice: '#inlineBundleTotal',
  saveButton: '#inlineBundleSave',
  resetButton: '#inlineBundleReset',
  existingBundleSelect: '#inlineBundleExistingSelect',
  panelHeadingLabel: '#inlineBundleHeading',
  viewBundleLink: '#inlineBundleViewLink',
  emptyState: '#inlineBundleEmptyState',
  currency: 'INR',
};

const DEFAULT_UI_TEXTS = {
  panelTitle: 'Bundle in progress',
  emptyState: 'Add a book to start a bundle',
  existingBundleLabel: 'Continue existing bundle',
  saveLabel: 'Save bundle',
  updateLabel: 'Update bundle',
  viewBundleLabel: 'View bundle',
  clearBundleLabel: 'Clear bundle',
};

export async function loadInlineBundleComposer(options = {}) {
  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom(options.domSource);
  const params = { ...DEFAULT_PARAMS, ...(options.params || {}) };
  const adapters = buildAdapters(options.adapters || {});
  const uiTexts = { ...DEFAULT_UI_TEXTS, ...(options.uiTexts || {}) };
  const mountOptions = options.options || {};

  let moduleRef;
  let importError;
  try {
    moduleRef = await import(composerModuleUrl.href);
  } catch (error) {
    importError = error;
  }

  const mountFn =
    moduleRef?.mountInlineBundleComposer ||
    moduleRef?.mount ||
    moduleRef?.default ||
    null;

  let mountError;
  let api = null;
  if (typeof mountFn === 'function') {
    try {
      api = mountFn(dom.container, { params, adapters, uiTexts, options: mountOptions });
    } catch (error) {
      mountError = error;
    }
  }

  return {
    api,
    importError,
    mountError,
    adapters,
    params,
    uiTexts,
    dom,
  };
}

export async function flushComposerPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

export function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
