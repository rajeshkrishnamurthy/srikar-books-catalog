import { compactText } from '../helpers/text.js';

const DEFAULT_SUMMARY_TEXT = 'No book selected';
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

export function initSaleLineItems(elements = {}, options = {}) {
  const refs = {
    draftForm: elements.draftForm || null,
    selectedBookSummary: elements.selectedBookSummary || null,
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
      'initSaleLineItems requires draft form, summary, hidden input, price input, button, message, table body, and totals refs.'
    );
    return null;
  }

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
    lines: [],
  };

  const defaultSummary =
    refs.selectedBookSummary.dataset.defaultSummary ||
    refs.selectedBookSummary.textContent?.trim() ||
    DEFAULT_SUMMARY_TEXT;
  refs.selectedBookSummary.dataset.defaultSummary = defaultSummary;
  refs.selectedBookSummary.dataset.empty = refs.bookIdInput.value ? 'false' : 'true';

  const teardown = [];

  const priceInputHandler = () => {
    clearMessage();
    updateAddButtonState();
  };
  refs.priceInput.addEventListener('input', priceInputHandler);
  teardown.push(() => refs.priceInput.removeEventListener('input', priceInputHandler));

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

  hydrateInitialBookSelection();
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
    getLines: () => [...state.lines],
  };

  function applyBookSelection(rawBook) {
    const normalized = normalizeBookSnapshot(rawBook);
    state.selectedBook = normalized;
    if (!normalized) {
      resetDraft({ keepPrice: true });
      return;
    }
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
    clearMessage();
    updateAddButtonState();
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
    return {
      id,
      title: title && title !== defaultSummary ? title : '',
      supplier,
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
      supplier: state.selectedBook?.supplier,
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
    return { valid: true, sellingPrice, lineId: null };
  }

  function appendLineRow(line) {
    const row = document.createElement('tr');
    row.dataset.lineId = line.lineId;
    row.dataset.bookId = line.bookId;
    if (line.supplier?.id) {
      row.dataset.supplierId = line.supplier.id;
    }

    const bookCell = document.createElement('td');
    const titleSpan = document.createElement('span');
    titleSpan.textContent = line.bookTitle || 'Untitled';
    bookCell.appendChild(titleSpan);

    if (line.supplier?.name) {
      const supplierSpan = document.createElement('span');
      supplierSpan.className = 'muted';
      const supplierLocation = line.supplier.location ? ` — ${line.supplier.location}` : '';
      supplierSpan.textContent = ` ${line.supplier.name}${supplierLocation}`;
      bookCell.appendChild(document.createTextNode(' '));
      bookCell.appendChild(supplierSpan);
    }

    const priceCell = document.createElement('td');
    priceCell.className = 'numeric';
    priceCell.textContent = deps.formatCurrency(line.sellingPrice);

    row.append(bookCell, priceCell);
    refs.lineItemsBody.appendChild(row);
  }

  function resetDraft(options = {}) {
    const { keepPrice = false } = options;
    state.selectedBook = null;
    refs.bookIdInput.value = '';
    refs.selectedBookSummary.textContent = defaultSummary;
    refs.selectedBookSummary.dataset.empty = 'true';
    if (!keepPrice) {
      refs.priceInput.value = '';
    }
    updateAddButtonState();
  }

  function updateAddButtonState() {
    if (!refs.addLineBtn) return;
    const hasBook = Boolean(state.selectedBook?.id);
    const priceOk = normalizeSellingPrice(refs.priceInput.value) != null;
    refs.addLineBtn.disabled = !(hasBook && priceOk);
  }

  function updateTotals() {
    const count = state.lines.length;
    const totalAmount = state.lines.reduce((sum, line) => sum + (line.sellingPrice || 0), 0);
    if (refs.totalsCountEl) {
      const suffix = count === 1 ? 'line' : 'lines';
      refs.totalsCountEl.textContent = `${count} ${suffix}`;
    }
    if (refs.totalsAmountEl) {
      refs.totalsAmountEl.textContent = deps.formatCurrency(totalAmount);
    }
  }

  function setMessage(text) {
    if (!refs.msgEl) return;
    refs.msgEl.textContent = text || '';
  }

  function clearMessage() {
    setMessage('');
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

function hasRequiredRefs(refs) {
  return Boolean(
    refs.draftForm &&
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

function extractBookFromDom() {
  if (!refs?.bookIdInput) return null;
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
  return {
    id,
    title: title && title !== defaultSummary ? title : '',
    supplier,
  };
}
