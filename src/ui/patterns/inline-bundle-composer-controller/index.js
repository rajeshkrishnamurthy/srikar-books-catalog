const DEFAULT_OPTIONS = {
  debounceMs: 25,
};

function generateBundleId() {
  return `inline-bundle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBookId(rawId) {
  if (rawId === null || rawId === undefined) return null;
  if (typeof rawId === 'string' && rawId.trim()) return rawId.trim();
  if (typeof rawId === 'number') return String(rawId);
  return null;
}

function cloneState(state) {
  return {
    ...state,
    books: Array.isArray(state.books) ? state.books.map((book) => ({ ...book })) : [],
    validationErrors: { ...(state.validationErrors || {}) },
  };
}

function createDefaultState() {
  return {
    bundleId: null,
    resumeBundleId: null,
    books: [],
    bundleName: '',
    bundlePriceMinor: null,
    recommendedPriceMinor: null,
    totalSalePriceMinor: 0,
    validationErrors: {},
    isSaving: false,
    lastInteraction: null,
  };
}

function coerceBundlePrice(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? null : numeric;
  }
  if (value === null || value === undefined) return null;
  return value;
}

export function createInlineBundleComposerController(config = {}) {
  const { params = {}, adapters = {}, uiTexts = {}, options = {} } = config;
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const state = createDefaultState();

  let recommendationTimer = null;
  let recommendationRequestId = 0;
  let pendingSavePromise = null;

  const updateInteraction = () => {
    state.lastInteraction = Date.now();
  };

  const emitState = ({ persistDraft = false } = {}) => {
    updateInteraction();
    const snapshot = cloneState(state);
    if (typeof adapters.onStateChange === 'function') {
      adapters.onStateChange(snapshot);
    }
    if (persistDraft && typeof adapters.persistDraft === 'function') {
      adapters.persistDraft(snapshot);
    }
    return snapshot;
  };

  const getState = () => cloneState(state);

  const ensureBundleId = () => {
    if (!state.bundleId) {
      state.bundleId = generateBundleId();
    }
    return state.bundleId;
  };

  const shouldRequestRecommendation = () => {
    const threshold = Number(params.recommendationThreshold) || 0;
    return Array.isArray(state.books) && state.books.length >= threshold && threshold > 0;
  };

  const clearRecommendation = () => {
    recommendationRequestId += 1;
    state.recommendedPriceMinor = null;
  };

  const scheduleRecommendation = () => {
    if (recommendationTimer) {
      clearTimeout(recommendationTimer);
    }

    if (!shouldRequestRecommendation()) {
      clearRecommendation();
      emitState();
      return;
    }

    const requestId = ++recommendationRequestId;
    recommendationTimer = setTimeout(async () => {
      recommendationTimer = null;
      const payload = {
        bookIds: state.books.map((book) => book.id),
        currency: params.currency,
      };

      try {
        if (typeof adapters.fetchPriceRecommendation === 'function') {
          const result = await adapters.fetchPriceRecommendation(payload);
          if (requestId !== recommendationRequestId) return;
          state.recommendedPriceMinor = result?.recommendedPriceMinor ?? null;
          if (Object.prototype.hasOwnProperty.call(result || {}, 'totalSalePriceMinor')) {
            state.totalSalePriceMinor = result.totalSalePriceMinor;
          }
        } else {
          state.recommendedPriceMinor = null;
        }
      } catch {
        if (requestId !== recommendationRequestId) return;
        state.recommendedPriceMinor = null;
      }
      emitState();
    }, mergedOptions.debounceMs);
  };

  const addBook = (book = {}) => {
    const bookId = normalizeBookId(book.id);
    if (!bookId) return;
    ensureBundleId();

    const alreadySelected = state.books.some((entry) => entry.id === bookId);
    if (!alreadySelected) {
      const title = typeof book.title === 'string' ? book.title.trim() : '';
      state.books.push({
        id: bookId,
        title,
        salePriceMinor: book.salePriceMinor,
      });
    }

    emitState({ persistDraft: true });
    scheduleRecommendation();
  };

  const removeBook = (bookId) => {
    const normalized = normalizeBookId(bookId);
    if (!normalized) return;
    const priorLength = state.books.length;
    state.books = state.books.filter((entry) => entry.id !== normalized);
    if (state.books.length === priorLength) return;

    emitState({ persistDraft: true });
    scheduleRecommendation();
  };

  const setExistingBundle = async (bundleId) => {
    if (recommendationTimer) {
      clearTimeout(recommendationTimer);
      recommendationTimer = null;
    }
    recommendationRequestId += 1;
    state.recommendedPriceMinor = null;
    state.totalSalePriceMinor = 0;

    if (typeof adapters.loadBundle !== 'function' || !bundleId) return;
    const restored = await adapters.loadBundle(bundleId);
    if (!restored) return;

    state.bundleId = bundleId;
    state.resumeBundleId = bundleId;
    state.bundleName = restored.bundleName || '';
    state.bundlePriceMinor = restored.bundlePriceMinor ?? null;
    state.books = Array.isArray(restored.bookIds)
      ? restored.bookIds.map((id) => ({ id: normalizeBookId(id) || '', title: '' })).filter((b) => b.id)
      : [];

    emitState({ persistDraft: true });
  };

  const reset = () => {
    if (recommendationTimer) {
      clearTimeout(recommendationTimer);
      recommendationTimer = null;
    }
    clearRecommendation();
    state.books = [];
    state.bundleName = '';
    state.bundlePriceMinor = null;
    state.recommendedPriceMinor = null;
    state.totalSalePriceMinor = 0;
    state.validationErrors = {};
    state.isSaving = false;

    emitState({ persistDraft: true });
  };

  const updateFields = (fields = {}) => {
    if (Object.prototype.hasOwnProperty.call(fields, 'bundleName')) {
      state.bundleName = typeof fields.bundleName === 'string' ? fields.bundleName : '';
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'bundlePriceMinor')) {
      state.bundlePriceMinor = coerceBundlePrice(fields.bundlePriceMinor);
    }
    emitState({ persistDraft: true });
  };

  const validateForSave = () => {
    const errors = {};
    const trimmedName = (state.bundleName || '').trim();
    const price = state.bundlePriceMinor;
    if (!trimmedName) {
      errors.bundleName = 'Bundle name is required';
    }
    if (typeof price !== 'number' || Number.isNaN(price) || price <= 0) {
      errors.bundlePrice = 'Bundle price must be positive';
    }

    state.bundleName = trimmedName;
    state.validationErrors = errors;
    emitState({ persistDraft: true });
    const hasErrors = Object.keys(errors).length > 0;
    return { hasErrors, trimmedName };
  };

  const saveBundle = () => {
    if (state.isSaving && pendingSavePromise) {
      return pendingSavePromise;
    }

    const { hasErrors, trimmedName } = validateForSave();
    if (hasErrors) {
      state.isSaving = false;
      return Promise.resolve();
    }

    state.isSaving = true;
    ensureBundleId();
    const payload = {
      bundleId: state.bundleId,
      bundleName: trimmedName,
      bundlePriceMinor: state.bundlePriceMinor,
      bookIds: state.books.map((book) => book.id),
    };

    emitState({ persistDraft: true });

    const saveCall =
      typeof adapters.saveBundle === 'function' ? adapters.saveBundle(payload) : Promise.resolve({});
    pendingSavePromise = Promise.resolve(saveCall)
      .then((result) => {
        state.isSaving = false;
        state.validationErrors = {};
        emitState({ persistDraft: true });
        pendingSavePromise = null;
        return result;
      })
      .catch((error) => {
        state.isSaving = false;
        emitState({ persistDraft: true });
        pendingSavePromise = null;
        throw error;
      });

    return pendingSavePromise;
  };

  const destroy = () => {
    if (recommendationTimer) {
      clearTimeout(recommendationTimer);
      recommendationTimer = null;
    }
    recommendationRequestId += 1;
    pendingSavePromise = null;
    state.books = [];
  };

  return {
    addBook,
    removeBook,
    setExistingBundle,
    reset,
    updateFields,
    saveBundle,
    getState,
    destroy,
  };
}

export default createInlineBundleComposerController;
