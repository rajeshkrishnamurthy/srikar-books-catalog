const defaultUiTexts = {
  recommendedPlaceholder: 'Add another book to see recommended price'
};

const defaultBooks = [
  { bookId: 'book-1', title: 'First Book', salePriceMinor: 1200, mrpMinor: 1500 },
  { bookId: 'book-2', title: 'Second Book', salePriceMinor: 1800, mrpMinor: 2200 },
  { bookId: 'book-3', title: 'Third Book', salePriceMinor: 900, mrpMinor: 1000 }
];

function buildBundleCompositionDom(uiTexts = {}) {
  const texts = { ...defaultUiTexts, ...uiTexts };
  document.body.innerHTML = `
    <section id="bundleCreate">
      <div id="bundleRecommendedPrice" aria-live="polite">${texts.recommendedPlaceholder}</div>
      <button data-test="bundleCreateAddBook" data-book-id="book-1" data-sale-price="1200" data-mrp="1500">Add book 1</button>
      <button data-test="bundleCreateAddBook" data-book-id="book-2" data-sale-price="1800" data-mrp="2200">Add book 2</button>
      <button id="bundleCreateSave" type="button">Save bundle</button>
    </section>
    <section id="inlineBundle">
      <div id="inlineBundleRecommended" aria-live="polite">${texts.recommendedPlaceholder}</div>
      <button data-test="bookAddToBundle" data-book-id="book-1" data-sale-price="1200" data-mrp="1500">Add inline book 1</button>
      <button data-test="bookAddToBundle" data-book-id="book-2" data-sale-price="1800" data-mrp="2200">Add inline book 2</button>
      <button id="inlineBundleSave" type="button">Save inline bundle</button>
    </section>
  `;

  return {
    bundleRecommended: document.getElementById('bundleRecommendedPrice'),
    inlineRecommended: document.getElementById('inlineBundleRecommended'),
    bundleAddButtons: Array.from(document.querySelectorAll("[data-test='bundleCreateAddBook']")),
    inlineAddButtons: Array.from(document.querySelectorAll("[data-test='bookAddToBundle']")),
    bundleSaveButton: document.getElementById('bundleCreateSave'),
    inlineSaveButton: document.getElementById('inlineBundleSave')
  };
}

async function mountBundleCompositionHarness(options = {}) {
  const { adapters = {}, params = {}, uiTexts = {} } = options;
  const elements = buildBundleCompositionDom(uiTexts);
  const finalAdapters = {
    computeRecommendation: jest.fn(({ bookSelections = [] }) => {
      const totalSale = bookSelections.reduce((sum, book) => sum + (book.salePriceMinor || 0), 0);
      const totalMrp = bookSelections.reduce((sum, book) => sum + (book.mrpMinor || 0), 0);
      const recommendedPriceMinor = Math.round(totalSale * 0.75);

      return Promise.resolve({
        recommendedPriceMinor,
        totalSalePriceMinor: totalSale,
        totalMrpMinor: totalMrp,
        recommendationComputedAt: Date.now()
      });
    }),
    saveBundle: jest.fn().mockResolvedValue({ bundleId: 'bundle-xyz' }),
    loadBundle: jest.fn().mockResolvedValue({ bundleName: '', bundlePriceMinor: null, books: [] }),
    onStateChange: jest.fn(),
    ...adapters
  };
  const finalParams = {
    currency: 'INR',
    recommendationThreshold: 2,
    recommendationDiscountPct: 25,
    pricePrecision: 2,
    ...params
  };

  let importError;
  let mountError;
  let api;
  let mountBundleComposition;

  try {
    const required = await import('../../src/ui/patterns/bundle-composition/index.js');
    const candidate = required?.default || required;
    mountBundleComposition =
      typeof candidate === 'function'
        ? candidate
        : candidate?.mountBundleComposition || candidate?.mount || candidate?.default;
  } catch (error) {
    importError = error;
  }

  if (!importError) {
    if (mountBundleComposition) {
      try {
        api = await mountBundleComposition(document.body, {
          params: finalParams,
          adapters: finalAdapters,
          uiTexts: { ...defaultUiTexts, ...uiTexts }
        });
      } catch (error) {
        mountError = error;
      }
    } else {
      mountError = new Error('mountBundleComposition export missing');
    }
  }

  return { elements, adapters: finalAdapters, params: finalParams, importError, mountError, api };
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

module.exports = {
  buildBundleCompositionDom,
  mountBundleCompositionHarness,
  defaultBooks,
  defaultUiTexts,
  flushMicrotasks
};
