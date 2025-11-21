const DEFAULT_PARAMS = {
  currency: 'INR',
  recommendationThreshold: 2,
  recommendationDiscountPct: 25,
  pricePrecision: 2,
  defaultStatus: 'Draft'
};

function getNumber(value) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildBookFromElement(el) {
  if (!el) return null;
  const bookId = el.dataset.bookId || el.dataset.bookid;
  if (!bookId) return null;

  return {
    bookId,
    title: el.dataset.title,
    salePriceMinor:
      getNumber(el.dataset.salePrice) || getNumber(el.dataset.salePriceMinor) || getNumber(el.getAttribute('data-sale-price')),
    mrpMinor:
      getNumber(el.dataset.mrp) || getNumber(el.dataset.mrpMinor) || getNumber(el.getAttribute('data-mrp')),
    supplierId: el.dataset.supplierId
  };
}

function sumField(books, field) {
  return books.reduce((total, book) => total + (book[field] || 0), 0);
}

function mountBundleComposition(container, options = {}) {
  const params = { ...DEFAULT_PARAMS, ...(options.params || {}) };
  const adapters = options.adapters || {};
  const uiTexts = options.uiTexts || {};

  const recommendedEls = Array.from(
    (container || document).querySelectorAll('#bundleRecommendedPrice, #inlineBundleRecommended')
  );
  const bundleAddButtons = Array.from(
    (container || document).querySelectorAll("[data-test='bundleCreateAddBook']")
  );
  const inlineAddButtons = Array.from(
    (container || document).querySelectorAll("[data-test='bookAddToBundle']")
  );
  const saveButtons = Array.from(
    (container || document).querySelectorAll('#bundleCreateSave, #inlineBundleSave')
  );

  const state = {
    books: [],
    totals: { totalSalePriceMinor: 0, totalMrpMinor: 0 },
    pricing: {
      recommendedPriceMinor: null,
      recommendationThreshold: params.recommendationThreshold,
      recommendationDiscountPct: params.recommendationDiscountPct,
      recommendationComputedAt: null
    },
    status: params.defaultStatus || 'Draft'
  };

  function notify() {
    if (typeof adapters.onStateChange === 'function') {
      adapters.onStateChange({ ...state, books: [...state.books] });
    }
  }

  function updateRecommendedDisplay() {
    const placeholder = uiTexts.recommendedPlaceholder || '';
    const text =
      state.pricing.recommendedPriceMinor != null
        ? String(state.pricing.recommendedPriceMinor)
        : placeholder;
    recommendedEls.forEach((el) => {
      el.textContent = text;
    });
  }

  function computeTotals() {
    state.totals.totalSalePriceMinor = sumField(state.books, 'salePriceMinor');
    state.totals.totalMrpMinor = sumField(state.books, 'mrpMinor');
  }

  function applyRecommendation(result) {
    computeTotals();
    const fallbackRecommended = Math.round(
      state.totals.totalSalePriceMinor * (1 - params.recommendationDiscountPct / 100)
    );
    state.pricing.recommendedPriceMinor =
      result?.recommendedPriceMinor != null ? result.recommendedPriceMinor : fallbackRecommended;
    state.pricing.recommendationComputedAt = result?.recommendationComputedAt || Date.now();
    state.pricing.recommendationThreshold = params.recommendationThreshold;
    state.pricing.recommendationDiscountPct = params.recommendationDiscountPct;
    updateRecommendedDisplay();
    notify();
  }

  function computeRecommendationIfReady() {
    if (state.books.length < params.recommendationThreshold) {
      updateRecommendedDisplay();
      return Promise.resolve();
    }

    const payload = {
      bookSelections: [...state.books],
      currency: params.currency,
      recommendationDiscountPct: params.recommendationDiscountPct
    };

    if (typeof adapters.computeRecommendation === 'function') {
      return Promise.resolve(adapters.computeRecommendation(payload)).then((result) => {
        applyRecommendation(result || {});
      });
    }

    applyRecommendation();
    return Promise.resolve();
  }

  function addBook(book) {
    if (!book || !book.bookId) return;
    const exists = state.books.some((b) => b.bookId === book.bookId);
    if (exists) return;

    state.books.push({ ...book });
    computeRecommendationIfReady();
  }

  function handleAddClick(event) {
    event.preventDefault();
    const book = buildBookFromElement(event.currentTarget);
    addBook(book);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!state.books.length || typeof adapters.saveBundle !== 'function') return;

    computeTotals();

    const bookIds = state.books.map((book) => book.bookId);
    const booksSnapshot = state.books.map((book, index) => ({
      id: book.bookId,
      price: book.salePriceMinor,
      supplierId: book.supplierId,
      title: book.title,
      position: index + 1
    }));
    const recommendedPriceRupees = state.pricing.recommendedPriceMinor;
    const totalListPriceRupees = state.totals.totalSalePriceMinor;

    const bundleDocument = {
      bundleName: params.bundleName || '',
      title: params.title || '',
      status: state.status,
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      supplierLocation: params.supplierLocation,
      createdBy: params.createdBy,
      createdByEmail: params.createdByEmail,
      createdAt: params.createdAt,
      books: state.books.map((book, index) => ({
        ...book,
        position: index + 1
      })),
      bookIds,
      booksSnapshot,
      recommendedPriceRupees,
      totalListPriceRupees,
      bundlePriceRupees: params.bundlePriceRupees || null,
      totals: { ...state.totals },
      pricing: {
        recommendedPriceMinor: state.pricing.recommendedPriceMinor,
        recommendationThreshold: state.pricing.recommendationThreshold,
        recommendationDiscountPct: state.pricing.recommendationDiscountPct,
        recommendationComputedAt: state.pricing.recommendationComputedAt,
        bundlePriceMinor: null
      }
    };

    await Promise.resolve(adapters.saveBundle(bundleDocument));
  }

  bundleAddButtons.forEach((btn) => btn.addEventListener('click', handleAddClick));
  inlineAddButtons.forEach((btn) => btn.addEventListener('click', handleAddClick));
  saveButtons.forEach((btn) => btn.addEventListener('click', handleSave));

  updateRecommendedDisplay();

  return {
    addBook,
    destroy() {
      bundleAddButtons.forEach((btn) => btn.removeEventListener('click', handleAddClick));
      inlineAddButtons.forEach((btn) => btn.removeEventListener('click', handleAddClick));
      saveButtons.forEach((btn) => btn.removeEventListener('click', handleSave));
    }
  };
}

module.exports = {
  mountBundleComposition: mountBundleComposition,
  mount: mountBundleComposition,
  default: mountBundleComposition
};
