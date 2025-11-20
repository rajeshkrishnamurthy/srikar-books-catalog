const defaultUiTexts = {
  panelTitle: 'Bundle in progress',
  recommendedPriceLabel: 'Recommended price',
  totalPriceLabel: 'Total sale price',
  totalMrpLabel: 'Total MRP',
  saveLabel: 'Save bundle',
  clearBundleLabel: 'Clear bundle'
};

const defaultBooks = [
  { id: 'book-1', title: 'First Book', salePriceMinor: 1200, mrpMinor: 1500 },
  { id: 'book-2', title: 'Second Book', salePriceMinor: 1800, mrpMinor: 2200 },
  { id: 'book-3', title: 'Third Book', salePriceMinor: 900 }
];

function buildInlineComposerDom(uiTexts = {}) {
  const texts = { ...defaultUiTexts, ...uiTexts };
  const recommendedCopy = texts.recommendedPlaceholder || texts.recommendedPriceLabel;
  const totalPriceCopy = texts.totalPricePlaceholder || texts.totalPriceLabel;
  const totalMrpCopy = texts.totalMrpPlaceholder || texts.totalMrpLabel;

  document.body.innerHTML = `
    <div id="inventory">
      <button data-test="bookAddToBundle" data-book-id="book-1" aria-controls="inlineBundleComposer">Add to bundle</button>
      <button data-test="bookAddToBundle" data-book-id="book-2" aria-controls="inlineBundleComposer">Add to bundle</button>
      <section id="inlineBundleComposer" role="region" aria-labelledby="inlineBundleHeading" hidden>
        <header>
          <h2 id="inlineBundleHeading">${texts.panelTitle}</h2>
        </header>
        <div id="inlineBundleSelectedBooks" aria-live="polite"></div>
        <div id="inlineBundleRecommended" aria-live="polite">${recommendedCopy}</div>
        <div id="inlineBundleTotal" aria-live="polite">${totalPriceCopy}</div>
        <div id="inlineBundleMrp" aria-live="polite">${totalMrpCopy}</div>
        <label for="inlineBundleName">Bundle name</label>
        <input id="inlineBundleName" type="text" />
        <label for="inlineBundlePrice">Bundle price</label>
        <input id="inlineBundlePrice" type="number" />
        <div class="actions">
          <button id="inlineBundleSave" type="button">${texts.saveLabel}</button>
          <button id="inlineBundleReset" type="button">${texts.clearBundleLabel}</button>
        </div>
        <select id="inlineBundleExistingSelect"></select>
      </section>
    </div>
  `;

  return {
    container: document.getElementById('inlineBundleComposer'),
    heading: document.getElementById('inlineBundleHeading'),
    selectedBooks: document.getElementById('inlineBundleSelectedBooks'),
    recommendedPrice: document.getElementById('inlineBundleRecommended'),
    totalPrice: document.getElementById('inlineBundleTotal'),
    totalMrp: document.getElementById('inlineBundleMrp'),
    bundleNameInput: document.getElementById('inlineBundleName'),
    bundlePriceInput: document.getElementById('inlineBundlePrice'),
    saveButton: document.getElementById('inlineBundleSave'),
    resetButton: document.getElementById('inlineBundleReset'),
    existingBundleSelect: document.getElementById('inlineBundleExistingSelect')
  };
}

async function mountInlineBundleComposerHarness(options = {}) {
  const { adapters = {}, uiTexts = {}, params = {}, bookFixtures = defaultBooks } = options;
  const elements = buildInlineComposerDom(uiTexts);
  const finalAdapters = {
    fetchPriceRecommendation: jest.fn().mockResolvedValue({
      recommendedPriceMinor: null,
      totalSalePriceMinor: null,
      totalMrpMinor: null
    }),
    loadBundle: jest.fn().mockResolvedValue({ bundleName: '', bundlePriceMinor: null, bookIds: [] }),
    listExistingBundles: jest.fn().mockResolvedValue([]),
    saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-123' }),
    linkBooks: jest.fn().mockResolvedValue(),
    formatPrice: jest
      .fn()
      .mockImplementation((valueInMinorUnits, currency) => `${currency} ${valueInMinorUnits}`),
    toastSuccess: jest.fn(),
    toastError: jest.fn(),
    announce: jest.fn(),
    ...adapters
  };

  let mountError;
  let importError;
  let mountInlineBundleComposer;
  let api;

  try {
    const required = require('../../src/ui/patterns/inline-bundle-composer');
    mountInlineBundleComposer =
      required.default || required.mountInlineBundleComposer || required.mount;
  } catch (requireError) {
    importError = requireError;

    try {
      const imported = await import('../../src/ui/patterns/inline-bundle-composer/index.js');
      importError = undefined;
      mountInlineBundleComposer =
        imported.default || imported.mountInlineBundleComposer || imported.mount;
    } catch (importFallbackError) {
      importError = importFallbackError;
    }
  }

  if (mountInlineBundleComposer && !importError) {
    try {
      api = await mountInlineBundleComposer(
        elements.container,
        {
          params: {
            container: '#inlineBundleComposer',
            panelHeading: '#inlineBundleHeading',
            triggerSelector: "[data-test='bookAddToBundle']",
            bookList: '#inlineBundleSelectedBooks',
            bundleNameInput: '#inlineBundleName',
            bundlePriceInput: '#inlineBundlePrice',
            recommendedPrice: '#inlineBundleRecommended',
            totalPrice: '#inlineBundleTotal',
            totalMrp: '#inlineBundleMrp',
            saveButton: '#inlineBundleSave',
            resetButton: '#inlineBundleReset',
            existingBundleSelect: '#inlineBundleExistingSelect',
            currency: 'INR',
            ...params
          },
          adapters: finalAdapters,
          uiTexts: { ...defaultUiTexts, ...uiTexts }
        }
      );
    } catch (error) {
      mountError = error;
    }
  } else if (!importError) {
    mountError = new Error('mountInlineBundleComposer export missing');
  }

  return { elements, bookFixtures, adapters: finalAdapters, importError, mountError, api };
}

async function addBooks(api, books = []) {
  if (!api || !api.controller || typeof api.controller.addBook !== 'function') {
    return;
  }

  for (const book of books) {
    await api.controller.addBook(book);
  }
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

module.exports = {
  buildInlineComposerDom,
  mountInlineBundleComposerHarness,
  addBooks,
  flushMicrotasks,
  defaultBooks,
  defaultUiTexts
};
