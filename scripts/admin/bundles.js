import { escapeHtml, compactText } from '../helpers/text.js';

const RUPEE = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function initBundleCreator(elements = {}, options = {}) {
  const {
    form,
    titleInput,
    supplierSelect,
    selectedBooksList,
    priceInput,
    priceMsg,
    msgEl,
    submitBtn,
    recommendedHint,
    resetBtn,
    bookSearchInput,
  } = elements;

  if (
    !form ||
    !titleInput ||
    !supplierSelect ||
    !selectedBooksList ||
    !priceInput ||
    !submitBtn
  ) {
    console.warn('initBundleCreator requires form, title, supplier, book list, price, and submit elements.');
    return null;
  }

  const firebase = options.firebase || globalThis.__firebaseMocks?.exports;
  if (!firebase) {
    throw new Error('Bundle creator requires Firebase dependencies (db, collection, addDoc, serverTimestamp).');
  }
  const { db, collection, addDoc, serverTimestamp } = firebase;
  const authContext = options.auth || null;
  const createBookLookup = typeof options.createBookLookup === 'function' ? options.createBookLookup : null;
  const onBundleCreated =
    typeof options.onBundleCreated === 'function' ? options.onBundleCreated : null;
  const now = typeof options.now === 'function' ? options.now : () => new Date();

  const bundlesRef = collection(db, 'bundles');
  const teardown = [];

  const state = {
    supplier: null,
    supplierLocked: false,
    books: [],
    recommendedPrice: null,
    totalPrice: 0,
    priceTouched: false,
    isSaving: false,
  };
  let lookupInstance = null;
  let supplierOptions = [];
  const submitLabel = submitBtn.textContent.trim() || 'Create bundle';
  let pendingSupplierRefresh = false;

  const api = {
    dispose,
    setSuppliers(list) {
      supplierOptions = normalizeSupplierList(list);
      if (state.supplierLocked) {
        const refreshed = supplierOptions.find((sup) => sup.id === state.supplier?.id);
        if (refreshed) {
          state.supplier = refreshed;
        }
        pendingSupplierRefresh = true;
        return;
      }
      renderSupplierOptions();
    },
  };

  supplierSelect.addEventListener('change', onSupplierChange);
  teardown.push(() => supplierSelect.removeEventListener('change', onSupplierChange));

  const titleHandler = () => updateSubmitState();
  titleInput.addEventListener('input', titleHandler);
  teardown.push(() => titleInput.removeEventListener('input', titleHandler));

  priceInput.addEventListener('input', onPriceInput);
  teardown.push(() => priceInput.removeEventListener('input', onPriceInput));

  form.addEventListener('submit', onSubmit);
  teardown.push(() => form.removeEventListener('submit', onSubmit));

  const resetHandler = () => {
    resetBundleState();
  };
  form.addEventListener('reset', resetHandler);
  teardown.push(() => form.removeEventListener('reset', resetHandler));

  if (resetBtn) {
    const manualResetHandler = () => {
      resetBundleState();
    };
    resetBtn.addEventListener('click', manualResetHandler);
    teardown.push(() => resetBtn.removeEventListener('click', manualResetHandler));
  }

  resetBundleState();
  return api;

  function renderSupplierOptions() {
    if (!supplierSelect) return;
    const previous = supplierSelect.value;
    supplierSelect.innerHTML = `<option value="">Choose supplier</option>`;
    supplierOptions.forEach((sup) => {
      const option = document.createElement('option');
      option.value = sup.id;
      option.textContent = sup.location ? `${sup.name} — ${sup.location}` : sup.name;
      supplierSelect.appendChild(option);
    });
    if (previous && supplierOptions.some((sup) => sup.id === previous)) {
      supplierSelect.value = previous;
    }
  }

  function onSupplierChange() {
    const supplierId = supplierSelect.value;
    if (!supplierId || state.supplierLocked) {
      updateSubmitState();
      return;
    }
    const selectedOption = supplierSelect.options[supplierSelect.selectedIndex];
    const parsedLabel = parseSupplierLabel(selectedOption?.textContent || '');
    const supplier = supplierOptions.find((sup) => sup.id === supplierId) || {
      id: supplierId,
      name: parsedLabel.name || 'Supplier',
      location: parsedLabel.location || '',
    };
    state.supplier = supplier;
    state.supplierLocked = true;
    supplierSelect.disabled = true;
    supplierSelect.dataset.locked = 'true';
    enableBookSearch();
    setMessage(`Supplier locked: ${supplier.name}`, false);
    startLookupForSupplier(supplier.id);
    updateSubmitState();
  }

  function startLookupForSupplier(supplierId) {
    if (!createBookLookup) return;
    disposeLookup();
    lookupInstance = createBookLookup({
      supplierId,
      onSelect: (book) => {
        if (book) {
          addBookToBundle(book);
        }
      },
      onNoMatch: () => {},
    });
  }

  function disposeLookup() {
    lookupInstance?.dispose?.();
    lookupInstance = null;
  }

  function addBookToBundle(rawBook) {
    if (!state.supplierLocked || !state.supplier) {
      setMessage('Select a supplier before adding books.', true);
      return;
    }
    const book = normalizeBook(rawBook);
    if (!book) {
      setMessage('Unable to use that book selection.', true);
      return;
    }
    if (!book.supplierId) {
      book.supplierId = state.supplier.id;
    }
    if (book.supplierId && book.supplierId !== state.supplier.id) {
      setMessage('This book belongs to another supplier. Use Reset to choose a different supplier.', true);
      return;
    }
    if (state.books.some((entry) => entry.id === book.id)) {
      setMessage('Book already added to this bundle.', true);
      return;
    }
    state.books.push(book);
    renderSelectedBooks();
    updatePricing();
    setMessage(`${book.title} added to bundle.`, false);
  }

  function removeBook(bookId) {
    state.books = state.books.filter((book) => book.id !== bookId);
    renderSelectedBooks();
    if (state.books.length < 2) {
      state.priceTouched = false;
      clearPriceInput({ clearError: true });
    }
    updatePricing();
  }

  function renderSelectedBooks() {
    if (!selectedBooksList) return;
    selectedBooksList.innerHTML = '';
    if (!state.books.length) {
      const empty = document.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'No books selected yet.';
      selectedBooksList.appendChild(empty);
      return;
    }
    state.books.forEach((book) => {
      const li = document.createElement('li');
      li.dataset.bookId = book.id;
      const row = document.createElement('div');
      row.className = 'bundle-selected-row';
      const title = document.createElement('span');
      title.className = 'bundle-selected-title';
      title.innerHTML = `<strong>${escapeHtml(book.title)}</strong><span class="muted">₹${RUPEE.format(
        book.price
      )}</span>`;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn btn-text';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeBook(book.id));
      row.appendChild(title);
      row.appendChild(removeBtn);
      li.appendChild(row);
      selectedBooksList.appendChild(li);
    });
  }

  function onPriceInput() {
    state.priceTouched = true;
    sanitizePriceInput();
    updatePricing();
  }

  function sanitizePriceInput() {
    const digits = priceInput.value.replace(/[^0-9]/g, '');
    if (digits !== priceInput.value) {
      priceInput.value = digits;
    }
    return digits;
  }

  function updatePricing() {
    state.totalPrice = state.books.reduce((sum, book) => sum + Math.max(0, Number(book.price) || 0), 0);
    state.recommendedPrice =
      state.books.length >= 2 && state.totalPrice > 0
        ? Math.max(1, Math.round(state.totalPrice * 0.75))
        : null;

    if (recommendedHint) {
      recommendedHint.textContent = state.recommendedPrice
        ? `Recommended: ₹${RUPEE.format(state.recommendedPrice)} (~25% off ₹${RUPEE.format(
            state.totalPrice
          )})`
        : 'Select at least two books to see a recommended price.';
    }

    if (!state.priceTouched && priceInput && priceInput.value) {
      priceInput.value = '';
    }
    applyPriceValidation();
    updateSubmitState();
  }

  function applyPriceValidation() {
    const { error } = validatePrice();
    if (priceMsg) {
      priceMsg.textContent = error || '';
    }
  }

  function validatePrice() {
    const raw = priceInput.value.trim();
    if (state.books.length < 2) {
      return { valid: false, value: null, error: '' };
    }
    if (!raw) {
      return { valid: false, value: null, error: 'Enter a bundle price to continue.' };
    }
    if (!/^\d+$/.test(raw)) {
      return { valid: false, value: null, error: 'Bundle price must be a whole number (₹).' };
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 1) {
      return { valid: false, value: null, error: 'Bundle price must be at least ₹1.' };
    }
    if (state.totalPrice > 0 && value > state.totalPrice) {
      return { valid: false, value: null, error: 'Bundle price cannot exceed the sum of book prices.' };
    }
    return { valid: true, value, error: '' };
  }

  async function onSubmit(event) {
    event.preventDefault();
    const priceState = validatePrice();
    if (!priceState.valid) {
      applyPriceValidation();
      updateSubmitState();
      return;
    }
    if (!state.supplierLocked || state.books.length < 2) {
      updateSubmitState();
      return;
    }
    if (!titleInput.value.trim()) {
      setMessage('Bundle title is required.', true);
      updateSubmitState();
      return;
    }
    try {
      state.isSaving = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
      setMessage('Saving bundle…', false);

      const bundleTitle = compactText(titleInput.value);
      const docRef = await addDoc(bundlesRef, {
        title: bundleTitle,
        supplierId: state.supplier.id,
        supplierName: state.supplier.name,
        supplierLocation: state.supplier.location || '',
        bookIds: state.books.map((book) => book.id),
        books: state.books.map((book) => ({
          id: book.id,
          title: book.title,
          price: book.price,
          supplierId: book.supplierId || state.supplier.id,
        })),
        status: 'Draft',
        totalListPriceRupees: state.totalPrice,
        recommendedPriceRupees: state.recommendedPrice ?? priceState.value,
        bundlePriceRupees: priceState.value,
        createdAt: typeof serverTimestamp === 'function' ? serverTimestamp() : now(),
        createdBy: authContext?.currentUser?.uid || 'admin',
        createdByEmail: authContext?.currentUser?.email || '',
      });

      setMessage('Bundle created as Draft. It is hidden until you publish it.', false);
      if (docRef?.id) {
        onBundleCreated?.({
          id: docRef.id,
          title: bundleTitle,
          bundlePriceRupees: priceState.value,
          status: 'Draft',
        });
      }
      form.reset();
      resetBundleState();
    } catch (error) {
      console.error('Failed to create bundle', error);
      setMessage('Could not create bundle. Please try again.', true);
    } finally {
      state.isSaving = false;
      submitBtn.textContent = submitLabel;
      updateSubmitState();
    }
  }

  function clearPriceInput({ clearError = false } = {}) {
    if (priceInput) {
      priceInput.value = '';
    }
    if (clearError && priceMsg) {
      priceMsg.textContent = '';
    }
  }

  function resetBundleState() {
    state.supplier = null;
    state.supplierLocked = false;
    state.books = [];
    state.recommendedPrice = null;
    state.priceTouched = false;
    state.totalPrice = 0;
    supplierSelect.disabled = false;
    supplierSelect.dataset.locked = '';
    supplierSelect.value = '';
    renderSupplierOptions();
    pendingSupplierRefresh = false;
    disposeLookup();
    disableBookSearch();
    renderSelectedBooks();
    clearPriceInput({ clearError: true });
    if (recommendedHint) {
      recommendedHint.textContent = 'Select at least two books to see a recommended price.';
    }
    setMessage('');
    updateSubmitState();
  }

  function enableBookSearch() {
    bookSearchInput?.removeAttribute('disabled');
  }

  function disableBookSearch() {
    if (bookSearchInput) {
      bookSearchInput.value = '';
      bookSearchInput.setAttribute('disabled', 'disabled');
    }
  }

  function updateSubmitState() {
    const ready =
      !state.isSaving &&
      Boolean(titleInput.value.trim()) &&
      state.supplierLocked &&
      state.books.length >= 2 &&
      validatePrice().valid;
    submitBtn.disabled = !ready;
  }

  function setMessage(text = '', isError = false) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    if (!text) {
      msgEl.classList.remove('error');
      return;
    }
    msgEl.classList.toggle('error', !!isError);
  }

  function dispose() {
    teardown.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('bundle creator cleanup failed', error);
      }
    });
    disposeLookup();
  }
}

function normalizeSupplierList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((sup) => ({
      id: String(sup.id || ''),
      name: compactText(sup.name || ''),
      location: compactText(sup.location || ''),
    }))
    .filter((sup) => sup.id && sup.name);
}

function normalizeBook(raw) {
  if (!raw || !raw.id) {
    return null;
  }
  const priceSource =
    raw.Price ??
    raw.price ??
    raw.sellingPrice ??
    raw.mrp ??
    raw.listPrice ??
    raw.history?.lastSellingPrice ??
    0;
  const parsedPrice = normalizePriceValue(priceSource);
  return {
    id: String(raw.id),
    title: compactText(raw.title || 'Untitled book'),
    price: parsedPrice ?? 0,
    supplierId: raw.supplierId || raw.supplier?.id || null,
  };
}

function parseSupplierLabel(label = '') {
  const parts = label.split('—');
  const name = compactText(parts.shift() || '');
  const location = compactText(parts.join('—'));
  return { name, location };
}

function normalizePriceValue(value) {
  if (value == null) return null;
  if (typeof value === 'object') {
    if (value.amount != null) {
      value = value.amount;
    } else if (value.value != null) {
      value = value.value;
    }
  }
  const str = String(value).trim();
  if (!str) return null;
  const cleaned = str.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.round(num));
}
