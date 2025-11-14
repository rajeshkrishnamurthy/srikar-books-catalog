import { escapeHtml, compactText } from '../helpers/text.js';
const RUPEE = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

export function initBundleList(elements = {}, dependencies = {}) {
  const {
    searchInput,
    searchHiddenInput,
    suggestionsEl,
    searchMsg,
    summaryEl,
    supplierSelect,
    statusSelect,
    resultsEl,
    emptyEl,
  } = elements;

  if (
    !searchInput ||
    !supplierSelect ||
    !statusSelect ||
    !resultsEl ||
    !emptyEl
  ) {
    console.warn(
      'initBundleList requires search input, supplier select, status select, results, and empty elements.'
    );
    return null;
  }

  const loadBundles =
    typeof dependencies.loadBundles === 'function'
      ? dependencies.loadBundles
      : null;
  const loadSuppliers =
    typeof dependencies.loadSuppliers === 'function'
      ? dependencies.loadSuppliers
      : null;
  const renderPublishControls =
    typeof dependencies.renderPublishControls === 'function'
      ? dependencies.renderPublishControls
      : (() => '');
  const createBookLookup =
    typeof dependencies.createBookLookup === 'function'
      ? dependencies.createBookLookup
      : null;
  const hydrateBundleBooks =
    typeof dependencies.hydrateBundleBooks === 'function'
      ? dependencies.hydrateBundleBooks
      : null;

  let bundles = [];
  let suppliers = [];
  const state = {
    selectedBookId: '',
    supplierId: '',
    status: '',
  };
  const teardown = [];
  const hydrationTracker = new Map();
  let lookupInstance = null;
  const summaryLabel =
    summaryEl?.querySelector('.bundle-selected-chip__label') || summaryEl;
  const summaryClearBtn =
    summaryEl?.querySelector('.bundle-selected-chip__clear') || null;
  if (summaryClearBtn) {
    const summaryClearHandler = () => {
      if (!state.selectedBookId) return;
      clearSelectedBook({ focusInput: true });
    };
    summaryClearBtn.addEventListener('click', summaryClearHandler);
    teardown.push(() =>
      summaryClearBtn.removeEventListener('click', summaryClearHandler)
    );
  }

  if (searchInput) {
    searchInput.addEventListener('input', onSearchInput);
    teardown.push(() =>
      searchInput.removeEventListener('input', onSearchInput)
    );
  }
  supplierSelect.addEventListener('change', onSupplierChange);
  statusSelect.addEventListener('change', onStatusChange);

  teardown.push(() =>
    supplierSelect.removeEventListener('change', onSupplierChange)
  );
  teardown.push(() =>
    statusSelect.removeEventListener('change', onStatusChange)
  );

  if (createBookLookup && searchInput && suggestionsEl) {
    lookupInstance = createBookLookup({
      input: searchInput,
      hiddenInput: searchHiddenInput,
      list: suggestionsEl,
      msgEl: searchMsg,
      summaryEl,
      debounceMs: 150,
      onSelect: handleBookSelect,
      onNoMatch: handleNoMatch,
    });
    teardown.push(() => lookupInstance?.dispose?.());
  }

  hydrate();

  return {
    dispose() {
      teardown.forEach((fn) => {
        try {
          fn();
        } catch (error) {
          console.error('bundle list cleanup failed', error);
        }
      });
    },
    setBundles(list = []) {
      bundles = normalizeBundles(list);
      render();
    },
    setSuppliers(list = []) {
      suppliers = normalizeSuppliers(list);
      renderSupplierOptions();
    },
    refresh() {
      hydrate();
    },
    clearSelection() {
      clearSelectedBook();
    },
    setError(error) {
      setErrorState(error);
    },
  };

  async function hydrate() {
    try {
      const [bundlePayload, supplierPayload] = await Promise.all([
        loadBundles ? loadBundles() : [],
        loadSuppliers ? loadSuppliers() : [],
      ]);
      bundles = normalizeBundles(bundlePayload);
      suppliers = normalizeSuppliers(supplierPayload);
      renderSupplierOptions();
      if (state.selectedBookId) {
        const hydration = hydrateBundlesIfNeeded();
        if (hydration) {
          await hydration;
        }
      }
      render();
    } catch (error) {
      console.error('Failed to load bundle list data', error);
      setEmptyState(true);
    }
  }

  function handleBookSelect(book) {
    if (!book) {
      clearSelectedBook();
      return;
    }
    state.selectedBookId = book.id || '';
    if (searchHiddenInput) {
      searchHiddenInput.value = state.selectedBookId;
    }
    updateSummaryChip(book);
    if (searchInput) {
      searchInput.value = '';
    }
    setSearchMessage('');
    const hydration = hydrateBundlesIfNeeded();
    if (hydration) {
      hydration.finally(() => render());
    } else {
      render();
    }
  }

  function handleNoMatch(query = '') {
    if (!searchMsg) return;
    if (!query) {
      searchMsg.textContent = '';
      return;
    }
    searchMsg.textContent = 'No bundles contain that book. Select another.';
  }

  function setSearchMessage(message = '') {
    if (!searchMsg) return;
    searchMsg.textContent = compactText(message);
  }

  function clearSelectedBook({ focusInput = false } = {}) {
    state.selectedBookId = '';
    if (searchHiddenInput) {
      searchHiddenInput.value = '';
    }
    updateSummaryChip(null);
    setSearchMessage('');
    if (focusInput && searchInput) {
      searchInput.focus();
    }
    render();
  }

  function updateSummaryChip(book) {
    if (!summaryEl || !summaryLabel) return;
    if (book) {
      summaryLabel.textContent = book.title || 'Selected book';
      summaryEl.dataset.empty = 'false';
    } else {
      summaryLabel.textContent = 'No book selected.';
      summaryEl.dataset.empty = 'true';
    }
  }

  function setErrorState(error) {
    const code = error?.code || '';
    const isPerm = code.includes('permission') || code.includes('denied');
    setSearchMessage(
      isPerm
        ? 'You do not have access to bundles. Ask an admin to grant permissions.'
        : 'Bundles could not be loaded. Please try again.'
    );
    resultsEl.innerHTML = '';
    setEmptyState(true);
  }

  function onSearchInput() {
    if (!state.selectedBookId) {
      setSearchMessage(
        searchInput.value ? 'Select a book to filter bundles.' : ''
      );
    }
  }

  function onSupplierChange() {
    state.supplierId = supplierSelect.value || '';
    render();
  }

  function onStatusChange() {
    state.status = statusSelect.value || '';
    render();
  }

  function renderSupplierOptions() {
    const previous = supplierSelect.value;
    const defaultOption = supplierSelect.querySelector('option[value=""]');
    supplierSelect.innerHTML = '';
    if (defaultOption) {
      supplierSelect.appendChild(defaultOption);
    } else {
      const fallbackOption = document.createElement('option');
      fallbackOption.value = '';
      fallbackOption.textContent = 'All suppliers';
      supplierSelect.appendChild(fallbackOption);
    }
    suppliers.forEach((supplier) => {
      const option = document.createElement('option');
      option.value = supplier.id;
      option.textContent = supplier.location
        ? `${supplier.name} — ${supplier.location}`
        : supplier.name;
      supplierSelect.appendChild(option);
    });
    if (previous && suppliers.some((sup) => sup.id === previous)) {
      supplierSelect.value = previous;
    } else {
      supplierSelect.value = '';
    }
  }

  function render() {
    const filtered = getFilteredBundles();
    resultsEl.innerHTML = '';
    if (!filtered.length) {
      setEmptyState(true);
      return;
    }
    const table = document.createElement('table');
    table.className = 'bundle-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Bundle</th>
          <th scope="col">Books included</th>
          <th scope="col">Bundle price</th>
          <th scope="col">Supplier</th>
          <th scope="col">Publish</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    filtered.forEach((bundle) => {
      tbody.appendChild(renderBundleRow(bundle));
    });
    table.appendChild(tbody);
    resultsEl.appendChild(table);
    setEmptyState(false);
  }

  function getFilteredBundles() {
    return bundles.filter((bundle) => {
      if (state.supplierId && bundle.supplier?.id !== state.supplierId) {
        return false;
      }
      if (state.status && (bundle.status || 'Draft') !== state.status) {
        return false;
      }
      if (state.selectedBookId) {
        const books = Array.isArray(bundle.books) ? bundle.books : [];
        return books.some((book) => book.id === state.selectedBookId);
      }
      return true;
    });
  }

  function renderBundleRow(bundle) {
    const row = document.createElement('tr');
    row.dataset.bundleId = bundle.id || '';
    row.dataset.bundleStatus = bundle.status || 'Draft';

    const titleCell = document.createElement('td');
    titleCell.innerHTML = `<strong>${escapeHtml(bundle.title || 'Untitled bundle')}</strong>`;

    const booksCell = document.createElement('td');
    booksCell.innerHTML = formatBooksList(bundle);

    const priceCell = document.createElement('td');
    priceCell.textContent = formatRupees(bundle.bundlePriceRupees);

    const supplierCell = document.createElement('td');
    supplierCell.textContent = bundle.supplier?.name || 'Supplier';

    const publishCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'bundle-row__actions';
    applyPublishControls(actions, renderPublishControls(bundle));
    publishCell.appendChild(actions);

    row.append(titleCell, booksCell, priceCell, supplierCell, publishCell);
    return row;
  }

  function wrapMeta(className, content) {
    if (!content) return '';
    return `<span class="${className}">${escapeHtml(String(content))}</span>`;
  }

  function setEmptyState(isEmpty) {
    if (!emptyEl) return;
    emptyEl.hidden = !isEmpty;
    if (isEmpty && !emptyEl.textContent.trim()) {
      emptyEl.textContent = 'No bundles found.';
    }
  }

  function normalizeBundles(list = []) {
    return (Array.isArray(list) ? list : [])
      .map((bundle) => {
        if (!bundle || !bundle.id) return null;
        const books = Array.isArray(bundle.books)
          ? bundle.books.filter(Boolean)
          : [];
        const supplier =
          bundle.supplier && bundle.supplier.id
            ? bundle.supplier
            : bundle.supplierId
            ? {
                id: bundle.supplierId,
                name: bundle.supplierName || 'Supplier',
                location: bundle.supplierLocation || '',
              }
            : null;
        return {
          ...bundle,
          supplier,
          books,
          bookCount: Number.isFinite(bundle.bookCount)
            ? bundle.bookCount
            : books.length,
          bundlePriceRupees: Number.isFinite(bundle.bundlePriceRupees)
            ? bundle.bundlePriceRupees
            : Number(bundle.bundlePriceRupees) || 0,
          title: compactText(bundle.title) || 'Untitled bundle',
          status: bundle.status || 'Draft',
          bookIds: Array.isArray(bundle.bookIds)
            ? bundle.bookIds.map((id) => String(id))
            : [],
        };
      })
      .filter(Boolean);
  }

  function normalizeSuppliers(list = []) {
    return (Array.isArray(list) ? list : [])
      .map((supplier) => {
        if (!supplier || !supplier.id) return null;
        return {
          id: supplier.id,
          name: compactText(supplier.name) || 'Supplier',
          location: compactText(supplier.location || ''),
        };
      })
      .filter(Boolean);
  }

  function formatRupees(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return '₹0';
    }
    return `₹${RUPEE.format(numeric)}`;
  }

  function formatBookCount(bundle) {
    const count = Number.isFinite(bundle.bookCount)
      ? bundle.bookCount
      : Array.isArray(bundle.books)
      ? bundle.books.length
      : 0;
    const label = count === 1 ? 'book' : 'books';
    return count ? `${count} ${label}` : '';
  }

  function formatBooksList(bundle) {
    const books = Array.isArray(bundle.books) ? bundle.books : [];
    if (!books.length) {
      return '—';
    }
    const items = books.map(
      (book) => `<li>${escapeHtml(book?.title || 'Book')}</li>`
    );
    return `<ul class="bundle-book-list">${items.join('')}</ul>`;
  }

  function applyPublishControls(container, controls) {
    if (!container) return;
    container.innerHTML = '';
    if (!controls) return;
    if (typeof controls === 'string') {
      container.innerHTML = controls;
      return;
    }
    if (controls instanceof Node) {
      container.appendChild(controls);
      return;
    }
    if (Array.isArray(controls)) {
      controls.forEach((control) => {
        if (typeof control === 'string') {
          const wrapper = document.createElement('span');
          wrapper.innerHTML = control;
          container.appendChild(wrapper);
        } else if (control instanceof Node) {
          container.appendChild(control);
        }
      });
    }
  }

  function hydrateBundlesIfNeeded() {
    if (!hydrateBundleBooks) {
      return null;
    }
    const tasks = [];
    bundles.forEach((bundle) => {
      if (!needsHydration(bundle) || hydrationTracker.has(bundle.id)) {
        return;
      }
      const task = Promise.resolve()
        .then(async () => {
          const hydrated = await hydrateBundleBooks(bundle);
          const normalized = Array.isArray(hydrated)
            ? hydrated
                .map((entry) => normalizeHydratedBook(entry, bundle))
                .filter(Boolean)
            : [];
          if (normalized.length) {
            bundle.books = normalized;
            if (!bundle.bookCount) {
              bundle.bookCount = normalized.length;
            }
          }
        })
        .catch((error) => console.error('bundle hydration failed', error))
        .finally(() => hydrationTracker.delete(bundle.id));
      hydrationTracker.set(bundle.id, task);
      tasks.push(task);
    });
    return tasks.length ? Promise.all(tasks) : null;
  }

  function needsHydration(bundle = {}) {
    if (!hydrateBundleBooks) return false;
    if (!Array.isArray(bundle.bookIds) || !bundle.bookIds.length) {
      return false;
    }
    return !Array.isArray(bundle.books) || !bundle.books.length;
  }

  function normalizeHydratedBook(raw = {}, bundle = {}) {
    const id = String(raw.id || '').trim();
    if (!id) return null;
    return {
      id,
      title: compactText(raw.title || ''),
      price: Number(raw.price) || 0,
      supplierId: raw.supplierId || bundle.supplier?.id || '',
    };
  }
}
