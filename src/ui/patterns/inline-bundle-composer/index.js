import { createInlineBundleComposerController } from '../inline-bundle-composer-controller/index.js';

const DEFAULT_UI_TEXTS = {
  panelTitle: 'Bundle in progress',
  emptyState: 'Add a book to start a bundle',
  existingBundleLabel: 'Continue existing bundle',
  saveLabel: 'Save bundle',
  updateLabel: 'Update bundle',
  clearBundleLabel: 'Clear bundle',
  viewBundleLabel: 'View bundle',
  totalMrpLabel: 'Total MRP',
  totalMrpPlaceholder: 'Total MRP unavailable',
};

const PLACEHOLDER = '—';

const isElement = (node) =>
  node && typeof node === 'object' && node.nodeType === 1 && typeof node.nodeName === 'string';

function resolveElement(ref, doc, { within } = {}) {
  if (!ref) return null;
  if (isElement(ref)) return ref;
  if (typeof ref === 'string') {
    const scope = isElement(within) ? within : doc;
    return scope?.querySelector?.(ref) || null;
  }
  return null;
}

function hasPositiveNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

function canSave(state = {}) {
  const hasBooks = Array.isArray(state.books) && state.books.length > 0;
  const hasName = typeof state.bundleName === 'string' && state.bundleName.trim().length > 0;
  const hasPrice = hasPositiveNumber(state.bundlePriceMinor);
  return hasBooks && hasName && hasPrice && !state.isSaving;
}

function formatPrice(value, currency, formatFn) {
  if (!hasPositiveNumber(value) && value !== 0) return PLACEHOLDER;
  if (typeof formatFn === 'function') {
    try {
      return formatFn(value, currency);
    } catch {
      // ignore formatter failures
    }
  }
  return String(value);
}

function mergeBooks(primary = [], secondary = []) {
  const merged = [];
  const seen = new Set();
  [...primary, ...secondary].forEach((book) => {
    const id = book?.id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(book);
  });
  return merged;
}

export function mountInlineBundleComposer(container, config = {}) {
  const { params = {}, adapters = {}, uiTexts = {}, options = {} } = config;
  const doc =
    (isElement(container) ? container.ownerDocument : null) ||
    (typeof document !== 'undefined' ? document : null);
  if (!doc) {
    return { destroy() {} };
  }

  const root = isElement(container) ? container : resolveElement(params.container, doc);
  const bundleNameInput = resolveElement(params.bundleNameInput, doc, { within: root });
  const bundlePriceInput = resolveElement(params.bundlePriceInput, doc, { within: root });
  const recommendedPrice = resolveElement(params.recommendedPrice, doc, { within: root });
  const totalPrice = resolveElement(params.totalPrice, doc, { within: root });
  const totalMrp = resolveElement(params.totalMrp, doc, { within: root });
  const saveButton = resolveElement(params.saveButton, doc, { within: root });
  const resetButton = resolveElement(params.resetButton, doc, { within: root });
  const viewLink = resolveElement(params.viewBundleLink, doc, { within: root });
  const existingBundleSelect = resolveElement(params.existingBundleSelect, doc, { within: root });
  const emptyState = resolveElement(params.emptyState, doc, { within: root });
  const bookList = resolveElement(params.bookList, doc, { within: root });
  const texts = { ...DEFAULT_UI_TEXTS, ...uiTexts };
  let selectedExistingBundleId = null;

  let saveInFlight = null;
  const userOnStateChange = adapters.onStateChange;

  const controllerParams = {
    currency: params.currency || 'USD',
    pricePrecision: params.pricePrecision || 2,
    recommendationThreshold: params.recommendationThreshold,
    ...(params.maxBooks !== undefined ? { maxBooks: params.maxBooks } : {}),
    ...(params.persistSessionKey ? { persistSessionKey: params.persistSessionKey } : {}),
  };

  const controllerAdapters = {
    ...adapters,
    onStateChange: (state) => {
      render(state);
      if (typeof userOnStateChange === 'function') {
        userOnStateChange(state);
      }
    },
  };

  const controller = createInlineBundleComposerController({
    params: controllerParams,
    adapters: controllerAdapters,
    uiTexts,
    options,
  });

  const stateFromController = () => (typeof controller?.getState === 'function' ? controller.getState() : {});
  let lastAnnouncedMrpText = null;

  function renderBooks(books = []) {
    if (!bookList) return;
    bookList.textContent = '';
    const list = Array.isArray(books) ? books : [];
    if (list.length === 0) {
      bookList.hidden = true;
      if (emptyState) emptyState.removeAttribute('hidden');
      return;
    }
    bookList.hidden = false;
    if (emptyState) emptyState.setAttribute('hidden', '');
    list.forEach((book) => {
      const entry = doc.createElement('div');
      entry.textContent = book?.title || book?.id || '';
      entry.dataset.id = book?.id || '';
      bookList.appendChild(entry);
    });
  }

  function render(state = stateFromController()) {
    const current = state || {};
    const books = Array.isArray(current.books) ? current.books : [];
    const updateBundleId = current.resumeBundleId || selectedExistingBundleId;
    const saveAllowed = canSave({ ...current, resumeBundleId: updateBundleId });

    if (root && books.length > 0) {
      root.hidden = false;
    }
    if (root) {
      if (current.isSaving) {
        root.setAttribute('aria-busy', 'true');
      } else {
        root.removeAttribute('aria-busy');
      }
    }

    renderBooks(books);

    if (bundleNameInput && typeof current.bundleName === 'string' && bundleNameInput.value !== current.bundleName) {
      bundleNameInput.value = current.bundleName;
    }

    if (bundlePriceInput) {
      const desiredPrice =
        current.bundlePriceMinor === null || current.bundlePriceMinor === undefined
          ? ''
          : String(current.bundlePriceMinor);
      if (bundlePriceInput.value !== desiredPrice) {
        bundlePriceInput.value = desiredPrice;
      }
    }

    if (recommendedPrice) {
      recommendedPrice.textContent = formatPrice(
        current.recommendedPriceMinor,
        controllerParams.currency,
        adapters.formatPrice
      );
    }
    if (totalPrice) {
      totalPrice.textContent = formatPrice(
        current.totalSalePriceMinor,
        controllerParams.currency,
        adapters.formatPrice
      );
    }
    if (totalMrp) {
      const hasMrpValue = hasPositiveNumber(current.totalMrpMinor) || current.totalMrpMinor === 0;
      const mrpText = hasMrpValue
        ? formatPrice(current.totalMrpMinor, controllerParams.currency, adapters.formatPrice)
        : texts.totalMrpPlaceholder || texts.totalMrpLabel || PLACEHOLDER;
      totalMrp.textContent = mrpText;

      if (typeof adapters.announce === 'function' && books.length > 0 && mrpText !== lastAnnouncedMrpText) {
        lastAnnouncedMrpText = mrpText;
        const announceLabel = texts.totalMrpLabel || 'Total MRP';
        const message = hasMrpValue ? `${announceLabel} updated to ${mrpText}` : `${announceLabel} unavailable`;
        adapters.announce(message);
      }
    }

    if (saveButton) {
      saveButton.disabled = !saveAllowed;
      saveButton.textContent = updateBundleId ? texts.updateLabel : texts.saveLabel;
    }
  }

  function showViewLink(bundleId) {
    if (!viewLink || !bundleId) return;
    viewLink.href = `#${bundleId}`;
    if (texts.viewBundleLabel) {
      viewLink.textContent = texts.viewBundleLabel;
    }
    viewLink.removeAttribute('hidden');
  }

  function clearViewLink() {
    if (!viewLink) return;
    viewLink.setAttribute('hidden', '');
    viewLink.removeAttribute('href');
  }

  async function startSave() {
    if (!controller || saveInFlight) return saveInFlight;
    const currentState = stateFromController();
    if (!canSave(currentState)) {
      render(currentState);
      return null;
    }

    const runPromise = (async () => {
      try {
        const result = await controller.saveBundle?.();
        const latestState = stateFromController();
        const bundleId =
          result?.bundleId || latestState.bundleId || selectedExistingBundleId || currentState.bundleId;
        const bookIds = Array.isArray(latestState.books) ? latestState.books.map((book) => book.id) : [];

        if (options?.analytics?.track) {
          options.analytics.track('bundleCreatedInline', { bundleId, bookIds });
        }

        if (typeof adapters.toastSuccess === 'function') {
          const bundleName = latestState.bundleName || currentState.bundleName || '';
          const message = bundleName ? `${bundleName} saved` : 'Bundle saved';
          adapters.toastSuccess(message, { bundleId });
        }

        showViewLink(bundleId);

        if (bundleId && typeof adapters.linkBooks === 'function') {
          await adapters.linkBooks(bundleId, bookIds);
        }
      } catch (error) {
        if (options?.analytics?.track) {
          options.analytics.track('bundleCreateFailedInline', { error });
        }
        if (typeof adapters.toastError === 'function') {
          const message = error?.message || 'Unable to save bundle';
          adapters.toastError(message, { error });
        }
      } finally {
        saveInFlight = null;
        render(stateFromController());
      }
    })();

    saveInFlight = runPromise;
    return runPromise;
  }

  async function hydrateExistingBundles() {
    if (!existingBundleSelect || typeof adapters.listExistingBundles !== 'function') return;
    let bundles = [];
    try {
      bundles = (await adapters.listExistingBundles()) || [];
    } catch {
      bundles = [];
    }
    existingBundleSelect.innerHTML = '';
    const placeholder = doc.createElement('option');
    placeholder.value = '';
    placeholder.textContent = texts.existingBundleLabel;
    existingBundleSelect.appendChild(placeholder);

    bundles.forEach((bundle) => {
      if (!bundle?.id) return;
      const option = doc.createElement('option');
      option.value = bundle.id;
      const name = bundle.name || bundle.id;
      const count = bundle.bookCount ? ` (${bundle.bookCount} books)` : '';
      option.textContent = `${name}${count}`;
      existingBundleSelect.appendChild(option);
    });
  }

  async function handleExistingSelection(event) {
    const selectedId = event?.target?.value;
    selectedExistingBundleId = selectedId || null;
    if (!selectedId) {
      render(stateFromController());
      return;
    }

    const preBooks = stateFromController().books || [];
    try {
      await controller.setExistingBundle?.(selectedId);
    } catch {
      // leave current context intact on load failure
    }

    const afterLoad = stateFromController();
    const merged = mergeBooks(afterLoad.books || [], preBooks);
    merged.forEach((book) => controller.addBook?.(book));
    render(stateFromController());
  }

  const handleNameInput = (event) => controller.updateFields?.({ bundleName: event?.target?.value || '' });
  const handlePriceInput = (event) =>
    controller.updateFields?.({ bundlePriceMinor: event?.target?.value ?? null });
  const handleReset = (event) => {
    event?.preventDefault?.();
    controller.reset?.();
    selectedExistingBundleId = null;
    clearViewLink();
    render(stateFromController());
  };
  const handleSaveClick = (event) => {
    event?.preventDefault?.();
    startSave();
  };

  bundleNameInput?.addEventListener('input', handleNameInput);
  bundlePriceInput?.addEventListener('input', handlePriceInput);
  existingBundleSelect?.addEventListener('change', handleExistingSelection);
  resetButton?.addEventListener('click', handleReset);
  saveButton?.addEventListener('click', handleSaveClick);

  render(stateFromController());
  hydrateExistingBundles();

  return {
    controller,
    destroy() {
      bundleNameInput?.removeEventListener('input', handleNameInput);
      bundlePriceInput?.removeEventListener('input', handlePriceInput);
      existingBundleSelect?.removeEventListener('change', handleExistingSelection);
      resetButton?.removeEventListener('click', handleReset);
      saveButton?.removeEventListener('click', handleSaveClick);
      controller?.destroy?.();
    },
  };
}

export const mount = mountInlineBundleComposer;
export default mountInlineBundleComposer;
