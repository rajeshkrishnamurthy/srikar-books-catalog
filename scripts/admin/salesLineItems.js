import { compactText } from '../helpers/text.js';

const DEFAULT_SUMMARY_TEXT = 'No book selected';
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

export function initSaleLineItems(elements = {}, options = {}) {
  const refs = {
    draftForm: elements.draftForm || null,
    draftLabelEl: elements.draftLabelEl || null,
    supplierSelect: elements.supplierSelect || null,
    selectedBookSummary: elements.selectedBookSummary || null,
    bookTitleInput: elements.bookTitleInput || elements.bookSearchInput || null,
    bookIdInput: elements.bookIdInput || null,
    priceInput: elements.priceInput || null,
    addLineBtn: elements.addLineBtn || null,
    msgEl: elements.msgEl || null,
    lineItemsBody: elements.lineItemsBody || null,
    totalsCountEl: elements.totalsCountEl || null,
    totalsAmountEl: elements.totalsAmountEl || null,
  };

  if (!hasRequiredRefs(refs)) {
    console.warn(
      'initSaleLineItems requires draft form, supplier select, summary, hidden input, price input, button, message, table body, and totals refs.'
    );
    return null;
  }

  const headerState = buildHeaderState(options.headerState);

  const deps = {
    lookup: options.lookup || null,
    onLinesChange: typeof options.onLinesChange === 'function' ? options.onLinesChange : () => {},
    formatCurrency:
      typeof options.formatCurrency === 'function' ? options.formatCurrency : formatCurrencyFallback,
    buildLineId:
      typeof options.buildLineId === 'function' ? options.buildLineId : () =>
        `line-${Math.random().toString(36).slice(2, 10)}`,
    serverTimestamp:
      typeof options.serverTimestamp === 'function' ? options.serverTimestamp : () => new Date(),
  };

  const state = {
    selectedBook: null,
    bookSupplierSnapshot: null,
    lines: [],
    headerReady: resolveHeaderReady(headerState),
    lockMessageActive: false,
    suppliers: [],
    selectedSupplier: null,
  };

  const defaultSummary =
    refs.selectedBookSummary.dataset.defaultSummary ||
    refs.selectedBookSummary.textContent?.trim() ||
    DEFAULT_SUMMARY_TEXT;
  refs.selectedBookSummary.dataset.defaultSummary = defaultSummary;
  refs.selectedBookSummary.dataset.empty = refs.bookIdInput.value ? 'false' : 'true';
  const defaultDraftLabelText =
    refs.draftLabelEl?.textContent?.trim() || '';

  const teardown = [];

  const priceInputHandler = () => {
    clearMessage();
    updateAddButtonState();
  };
  refs.priceInput.addEventListener('input', priceInputHandler);
  teardown.push(() => refs.priceInput.removeEventListener('input', priceInputHandler));

  const bookIdInputHandler = () => {
    if (!refs.bookIdInput) return;
    if (!refs.bookIdInput.value) {
      state.selectedBook = null;
      state.bookSupplierSnapshot = null;
      clearBookSummaryDataset();
      clearSupplierSelection();
    }
    updateAddButtonState();
  };
  refs.bookIdInput.addEventListener('input', bookIdInputHandler);
  teardown.push(() => refs.bookIdInput.removeEventListener('input', bookIdInputHandler));

  const supplierChangeHandler = () => handleSupplierChange();
  refs.supplierSelect.addEventListener('change', supplierChangeHandler);
  teardown.push(() => refs.supplierSelect.removeEventListener('change', supplierChangeHandler));

  const submitHandler = (event) => {
    event.preventDefault();
    handleAddLine();
  };
  refs.draftForm.addEventListener('submit', submitHandler);
  teardown.push(() => refs.draftForm.removeEventListener('submit', submitHandler));

  if (deps.lookup && typeof deps.lookup.onSelect === 'function') {
    const lookupHandler = (book) => applyBookSelection(book);
    const disposeLookup = deps.lookup.onSelect(lookupHandler);
    if (typeof disposeLookup === 'function') {
      teardown.push(() => disposeLookup());
    } else if (typeof deps.lookup.offSelect === 'function') {
      teardown.push(() => deps.lookup.offSelect(lookupHandler));
    }
  }

  if (typeof headerState.onReadyChange === 'function') {
    const unsubscribeHeader = headerState.onReadyChange((ready) => {
      const previous = state.headerReady;
      state.headerReady = Boolean(ready);
      applyHeaderLock({ previousReady: previous });
    });
    if (typeof unsubscribeHeader === 'function') {
      teardown.push(() => unsubscribeHeader());
    }
  }

  hydrateInitialBookSelection();
  applyHeaderLock({ previousReady: state.headerReady });
  updateAddButtonState();
  updateTotals();

  return {
    dispose() {
      while (teardown.length) {
        const cleanup = teardown.pop();
        try {
          cleanup?.();
        } catch (err) {
          console.error('sale line items cleanup failed', err);
        }
      }
    },
    resetDraft: () => resetDraft(),
    clearLines: () => clearLines(),
    getLines: () => [...state.lines],
    setSuppliers: (list) => setSupplierOptions(list),
  };

  function applyBookSelection(rawBook) {
    const normalized = normalizeBookSnapshot(rawBook);
    state.selectedBook = normalized;
    if (!normalized) {
      setDraftLabelText('');
      state.bookSupplierSnapshot = null;
      resetDraft({ keepPrice: true });
      return;
    }
    setDraftLabelText('');
    state.bookSupplierSnapshot = normalized.supplier || null;
    refs.bookIdInput.value = normalized.id;
    const summaryParts = [normalized.title];
    if (normalized.supplier?.name) {
      const location = normalized.supplier.location
        ? ` — ${normalized.supplier.location}`
        : '';
      summaryParts.push(`${normalized.supplier.name}${location}`);
    }
    refs.selectedBookSummary.textContent = summaryParts.filter(Boolean).join(' • ') || defaultSummary;
    refs.selectedBookSummary.dataset.empty = 'false';
    refs.selectedBookSummary.dataset.supplierId = normalized.supplier?.id || '';
    refs.selectedBookSummary.dataset.supplierName = normalized.supplier?.name || '';
    refs.selectedBookSummary.dataset.supplierLocation = normalized.supplier?.location || '';
    if (normalized.history) {
      refs.selectedBookSummary.dataset.bookHistory = JSON.stringify(normalized.history);
    } else {
      delete refs.selectedBookSummary.dataset.bookHistory;
    }
    if (refs.bookTitleInput) {
      refs.bookTitleInput.value = normalized.title;
    }
    if (state.headerReady) {
      setMessage('Book selected. Enter selling price.');
    } else {
      clearMessage();
    }
    updateAddButtonState();
    if (state.bookSupplierSnapshot) {
      setSupplierSelection(state.bookSupplierSnapshot);
    } else {
      clearSupplierSelection({ keepBookSnapshot: true });
    }
    focusPriceInput();
  }

  function hydrateInitialBookSelection() {
    const initialBook = extractBookFromDom();
    if (!initialBook) {
      if (!refs.bookIdInput.value) {
        refs.selectedBookSummary.textContent = defaultSummary;
        refs.selectedBookSummary.dataset.empty = 'true';
      }
      return;
    }
    applyBookSelection(initialBook);
  }

  function extractBookFromDom() {
    const id = (refs.bookIdInput.value || '').trim();
    if (!id) return null;
    const dataset = refs.selectedBookSummary?.dataset || {};
    const hasCustomSummary = dataset.empty === 'false';
    const title =
      dataset.bookTitle ||
      dataset.title ||
      (hasCustomSummary ? refs.selectedBookSummary?.textContent?.trim() : '');
    const supplierId = dataset.supplierId || dataset.bookSupplierId || '';
    const supplierName = dataset.supplierName || '';
    const supplierLocation = dataset.supplierLocation || '';
    const supplier = supplierId
      ? {
          id: supplierId,
          name: supplierName,
          location: supplierLocation,
        }
      : null;
    const historyData = dataset.bookHistory ? safeParseJson(dataset.bookHistory) : null;
    return {
      id,
      title: title && title !== defaultSummary ? title : '',
      supplier,
      history: normalizeHistory(historyData),
    };
  }

  function handleAddLine() {
    const draftState = validateDraft();
    if (!draftState.valid) {
      setMessage(draftState.message);
      updateAddButtonState();
      return;
    }

    const lineId = String(draftState.lineId || deps.buildLineId());
    const payload = buildSaleLinePayload({
      lineId,
      book: state.selectedBook,
      supplier: state.selectedSupplier,
      sellingPriceInput: refs.priceInput.value,
      serverTimestamp: deps.serverTimestamp,
    });
    if (!payload.lineId) {
      setMessage('Unable to add line. Please reselect the book and try again.');
      return;
    }

    state.lines.push(payload);
    appendLineRow(payload);
    updateTotals();
    deps.onLinesChange([...state.lines]);
    clearMessage();
    resetDraft();
  }

  function validateDraft() {
    if (!state.selectedBook?.id) {
      return { valid: false, message: 'Select a book before adding a line.' };
    }
    const sellingPrice = normalizeSellingPrice(refs.priceInput.value);
    if (sellingPrice == null) {
      return { valid: false, message: 'Selling price is required and must be a valid number.' };
    }
    if (!state.selectedSupplier?.id) {
      return { valid: false, message: 'Supplier selection is required.' };
    }
    return { valid: true, sellingPrice, lineId: null };
  }

  function appendLineRow(line) {
    const row = document.createElement('tr');
    row.className = 'sale-line-row';
    row.dataset.lineId = line.lineId;
    row.dataset.bookId = line.bookId;
    if (line.supplier?.id) {
      row.dataset.supplierId = line.supplier.id;
    }

    const titleCell = document.createElement('td');
    titleCell.className = 'sale-line-book';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'sale-line-book__title';
    titleSpan.textContent = line.bookTitle || 'Untitled';
    titleCell.appendChild(titleSpan);

    const supplierCell = document.createElement('td');
    supplierCell.className = 'sale-line-supplier';
    if (line.supplier?.name) {
      const supplierName = document.createElement('span');
      supplierName.className = 'sale-line-supplier__name';
      supplierName.textContent = line.supplier.name;
      supplierCell.appendChild(supplierName);

      if (line.supplier.location) {
        const supplierLocation = document.createElement('span');
        supplierLocation.className = 'sale-line-supplier__location';
        supplierLocation.textContent = line.supplier.location;
        supplierCell.appendChild(supplierLocation);
      }
    } else {
      supplierCell.textContent = '—';
    }

    const priceCell = document.createElement('td');
    priceCell.className = 'sale-line-book__price numeric';
    priceCell.textContent = deps.formatCurrency(line.sellingPrice);

    row.append(titleCell, supplierCell, priceCell);
    refs.lineItemsBody.appendChild(row);
  }

  function resetDraft(options = {}) {
    const { keepPrice = false } = options;
    state.selectedBook = null;
    state.bookSupplierSnapshot = null;
    refs.bookIdInput.value = '';
    resetBookSummaryContent();
    setDraftLabelText('');
    clearSupplierSelection({ silent: true });
    if (refs.bookTitleInput) {
      refs.bookTitleInput.value = '';
    }
    if (!keepPrice) {
      refs.priceInput.value = '';
    }
    updateAddButtonState();
    if (!keepPrice) {
      focusBookInput();
    }
  }

  function clearLines() {
    state.lines = [];
    refs.lineItemsBody.innerHTML = '';
    updateTotals();
  }

  function updateAddButtonState() {
    if (!refs.addLineBtn) return;
    const locked = !state.headerReady;
    const hasBook = Boolean(state.selectedBook?.id && refs.bookIdInput.value);
    const priceOk = normalizeSellingPrice(refs.priceInput.value) != null;
    const hasSupplier = Boolean(state.selectedSupplier?.id);
    refs.addLineBtn.disabled = locked || !(hasBook && priceOk && hasSupplier);
  }

  function updateTotals() {
    const count = state.lines.length;
    const totalAmount = state.lines.reduce((sum, line) => sum + (line.sellingPrice || 0), 0);
    if (refs.totalsCountEl) {
      refs.totalsCountEl.textContent = count ? `Order total` : '';
    }
    if (refs.totalsAmountEl) {
      const amountText = deps.formatCurrency(totalAmount);
      refs.totalsAmountEl.textContent = count ? amountText : '';
    }
  }

  function applyHeaderLock(options = {}) {
    const locked = !state.headerReady;
    if (refs.draftForm) {
      refs.draftForm.dataset.locked = locked ? 'true' : 'false';
    }
    if (refs.bookTitleInput) {
      refs.bookTitleInput.disabled = locked;
    }
    if (refs.supplierSelect) {
      refs.supplierSelect.disabled = locked;
    }
    if (refs.priceInput) {
      refs.priceInput.disabled = locked;
    }
    if (locked) {
      state.lockMessageActive = true;
      if (options.previousReady) {
        resetDraft();
      }
    } else if (state.lockMessageActive) {
      clearMessage();
      state.lockMessageActive = false;
    }
    if (!locked) {
      focusBookInput();
    }
    updateAddButtonState();
  }

  function focusBookInput() {
    if (!state.headerReady) return;
    refs.bookTitleInput?.focus?.();
  }

  function focusPriceInput() {
    if (!state.headerReady) return;
    refs.priceInput?.focus?.();
  }

  function setMessage(text) {
    if (!refs.msgEl) return;
    refs.msgEl.textContent = text || '';
  }

  function clearMessage() {
    setMessage('');
  }

  function setSupplierOptions(list = []) {
    state.suppliers = Array.isArray(list)
      ? list.map((supplier) => normalizeSupplierSnapshot(supplier)).filter(Boolean)
      : [];
    renderSupplierOptions();
    restoreSupplierSelection();
  }

  function renderSupplierOptions() {
    if (!refs.supplierSelect) return;
    const doc = refs.supplierSelect.ownerDocument;
    const suppliersForRender = getSupplierOptionsWithSnapshots();
    refs.supplierSelect.innerHTML = '';
    const placeholder = doc.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.textContent = 'Select supplier *';
    placeholder.selected = !state.selectedSupplier?.id;
    refs.supplierSelect.appendChild(placeholder);
    suppliersForRender.forEach((supplier) => {
      const option = doc.createElement('option');
      option.value = supplier.id;
      option.textContent = buildSupplierLabel(supplier);
      option.dataset.name = supplier.name;
      option.dataset.location = supplier.location;
      refs.supplierSelect.appendChild(option);
    });
  }

  function restoreSupplierSelection() {
    if (!refs.supplierSelect) return;
    const targetSupplier =
      (state.selectedSupplier?.id && findSupplierById(state.selectedSupplier.id)) ||
      (state.bookSupplierSnapshot?.id && findSupplierById(state.bookSupplierSnapshot.id)) ||
      null;
    if (targetSupplier?.id) {
      refs.supplierSelect.value = targetSupplier.id;
      state.selectedSupplier = normalizeSupplierSnapshot(targetSupplier);
    } else {
      refs.supplierSelect.value = '';
      if (!state.selectedSupplier?.id) {
        state.selectedSupplier = null;
      }
    }
    updateAddButtonState();
  }

  function handleSupplierChange() {
    if (!refs.supplierSelect) return;
    const selectedId = refs.supplierSelect.value;
    if (!selectedId) {
      state.selectedSupplier = null;
      updateAddButtonState();
      return;
    }
    const supplier =
      findSupplierById(selectedId) ||
      (state.bookSupplierSnapshot?.id === selectedId ? state.bookSupplierSnapshot : null);
    state.selectedSupplier = supplier ? normalizeSupplierSnapshot(supplier) : null;
    clearMessage();
    updateAddButtonState();
  }

  function setSupplierSelection(supplier, options = {}) {
    const normalized = normalizeSupplierSnapshot(supplier);
    state.selectedSupplier = normalized;
    if (normalized?.id) {
      ensureSupplierOption(normalized);
      refs.supplierSelect.value = normalized.id;
    } else if (refs.supplierSelect) {
      refs.supplierSelect.value = '';
    }
    if (!options.silent) {
      updateAddButtonState();
    }
  }

  function clearSupplierSelection(options = {}) {
    const { keepBookSnapshot = false, silent = false } = options;
    if (!keepBookSnapshot) {
      state.bookSupplierSnapshot = null;
    }
    state.selectedSupplier = null;
    if (refs.supplierSelect) {
      refs.supplierSelect.value = '';
    }
    if (!silent) {
      updateAddButtonState();
    }
  }

  function findSupplierById(id) {
    if (!id) return null;
    return getSupplierOptionsWithSnapshots().find((supplier) => supplier.id === id) || null;
  }

  function getSupplierOptionsWithSnapshots() {
    const map = new Map();
    const addSupplier = (supplier) => {
      const normalized = normalizeSupplierSnapshot(supplier);
      if (!normalized?.id || map.has(normalized.id)) {
        return;
      }
      map.set(normalized.id, normalized);
    };
    state.suppliers.forEach(addSupplier);
    addSupplier(state.bookSupplierSnapshot);
    addSupplier(state.selectedSupplier);
    return Array.from(map.values());
  }

  function ensureSupplierOption(supplier) {
    if (!refs.supplierSelect) return false;
    if (!supplier?.id) return false;
    const exists = Array.from(refs.supplierSelect.options || []).some(
      (option) => option.value === supplier.id
    );
    if (exists) {
      return true;
    }
    const option = refs.supplierSelect.ownerDocument.createElement('option');
    option.value = supplier.id;
    option.textContent = buildSupplierLabel(supplier);
    option.dataset.name = supplier.name;
    option.dataset.location = supplier.location;
    refs.supplierSelect.appendChild(option);
    return true;
  }

  function buildSupplierLabel(supplier) {
    if (!supplier) return 'Unknown supplier';
    const name = supplier.name || 'Unknown supplier';
    return supplier.location ? `${name} — ${supplier.location}` : name;
  }

  function resetBookSummaryContent() {
    refs.selectedBookSummary.textContent = defaultSummary;
    refs.selectedBookSummary.dataset.empty = 'true';
    clearBookSummaryDataset();
  }

  function clearBookSummaryDataset() {
    delete refs.selectedBookSummary.dataset.bookHistory;
    delete refs.selectedBookSummary.dataset.supplierId;
    delete refs.selectedBookSummary.dataset.supplierName;
    delete refs.selectedBookSummary.dataset.supplierLocation;
  }

  function setDraftLabelText(_title) {
    if (!refs.draftLabelEl) return;
    refs.draftLabelEl.textContent = defaultDraftLabelText;
  }
}

export function buildSaleLinePayload(options = {}) {
  const {
    lineId,
    book,
    supplier,
    sellingPriceInput,
    serverTimestamp,
  } = options || {};
  const normalizedLineId = lineId ? String(lineId) : '';
  const normalizedBook = normalizeBookSnapshot(book);
  const normalizedSupplier = normalizeSupplierSnapshot(supplier);
  const sellingPrice = normalizeSellingPrice(sellingPriceInput);
  if (!normalizedLineId || !normalizedBook || sellingPrice == null) {
    return {};
  }
  const createdAt = resolveTimestamp(serverTimestamp);
  const updatedAt = cloneTimestamp(createdAt);
  return {
    lineId: normalizedLineId,
    bookId: normalizedBook.id,
    bookTitle: normalizedBook.title,
    supplier: normalizedSupplier || {},
    sellingPrice,
    createdAt,
    updatedAt,
  };
}

function normalizeBookSnapshot(book) {
  if (!book || !book.id) {
    return null;
  }
  const supplier = normalizeSupplierSnapshot(book.supplier);
  return {
    id: String(book.id),
    title: compactText(book.title ?? ''),
    supplier,
    history: normalizeHistory(book.history),
  };
}

function normalizeSupplierSnapshot(supplier) {
  if (!supplier || !supplier.id) {
    return null;
  }
  return {
    id: String(supplier.id),
    name: compactText(supplier.name ?? ''),
    location: compactText(supplier.location ?? ''),
  };
}

function normalizeSellingPrice(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  if (!PRICE_PATTERN.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Number(parsed);
}

function normalizeHistory(history = null) {
  if (!history) return null;
  const purchase =
    history.purchasePrice != null && !Number.isNaN(Number(history.purchasePrice))
      ? Number(history.purchasePrice)
      : null;
  const selling =
    history.lastSellingPrice != null && !Number.isNaN(Number(history.lastSellingPrice))
      ? Number(history.lastSellingPrice)
      : null;
  if (purchase == null && selling == null) {
    return null;
  }
  return {
    purchasePrice: purchase,
    lastSellingPrice: selling,
    currency: history.currency || '₹',
  };
}

function resolveTimestamp(factory) {
  if (typeof factory === 'function') {
    return factory();
  }
  return new Date();
}

function cloneTimestamp(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  return value;
}

function formatCurrencyFallback(amount) {
  const number = Number(amount || 0);
  return `₹${number.toFixed(2)}`;
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasRequiredRefs(refs) {
  return Boolean(
    refs.draftForm &&
      refs.supplierSelect &&
      refs.selectedBookSummary &&
      refs.bookIdInput &&
      refs.priceInput &&
      refs.addLineBtn &&
      refs.msgEl &&
      refs.lineItemsBody &&
      refs.totalsCountEl &&
      refs.totalsAmountEl
  );
}

function buildHeaderState(state) {
  if (
    state &&
    typeof state.isReady === 'function' &&
    typeof state.onReadyChange === 'function'
  ) {
    return state;
  }
  return {
    isReady: () => false,
    onReadyChange: () => () => {},
  };
}

function resolveHeaderReady(state) {
  if (state && typeof state.isReady === 'function') {
    return Boolean(state.isReady());
  }
  return false;
}
