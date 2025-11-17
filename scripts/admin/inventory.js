// scripts/admin/inventory.js
// Intent: Inventory lists + row actions (sold/available/delete/edit/feature) + ADD BOOK submit wiring,
//         now with fast client-side filtering exposed via setFilter(term).

import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from '../lib/firebase.js';
import { stripHtmlAndSquash } from '../helpers/text.js';
import { bookMatchesQuery } from '../helpers/bookSearch.js';
import { createPaginationController } from '../helpers/data.js';
import { readCurrencyField } from './currency.js';

// ---- small utils ----
const onlyDigitsX = (v = '') => (v || '').toString().replace(/[^\dxX]/g, '');
const normalizeAuthorName = (str = '') =>
  String(str)
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
const authorKeyFromName = (str = '') =>
  normalizeAuthorName(str)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '-')
    .slice(0, 100);

function formatSupplierLabel(supplier = {}) {
  const name = normalizeAuthorName(supplier.name || '');
  const location = normalizeAuthorName(supplier.location || '');
  return location ? `${name} — ${location}` : name;
}

const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN');
const AVAILABLE_PAGE_SIZE = 20;

function formatPurchasePriceText(value) {
  if (value === undefined || value === null || value === '') {
    return 'Purchase price: Not set';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'Purchase price: Not set';
  }
  const formatted = RUPEE_FORMATTER.format(Math.round(numeric));
  return `Purchase price: ₹${formatted}`;
}

function matches(doc, term) {
  return bookMatchesQuery(
    {
      title: doc.title,
      author: doc.author,
      isbn: doc.isbn,
    },
    term
  );
}

// ---- row rendering ----
function rowHTML(id, b, sold = false) {
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  const price = b.price ? ` · ₹${b.price}` : '';
  const mrp = b.mrp ? ` · MRP ₹${b.mrp}` : '';
  const isbn = b.isbn ? ` · ISBN ${b.isbn}` : '';
  const featuredPill = b.featured
    ? ` <span class="pill" title="Shown on homepage">★ Featured</span>`
    : '';
  const featureBtn = b.featured
    ? `<button data-action="unfeature" class="btn btn-secondary">Unfeature</button>`
    : `<button data-action="feature" class="btn">Feature</button>`;

  return `
<article class="row" data-id="${id}">
  <img src="${img}" alt="" />
  <div class="row-meta">
    <strong>${(b.title || '').replace(/</g, '&lt;')}${featuredPill}</strong>
    <div class="muted">
      ${b.author || ''} · ${b.category || ''} · ${
    b.binding || ''
  }${price}${mrp}${isbn}
    </div>
    <div class="purchase-price muted">${formatPurchasePriceText(
      b.purchasePrice
    )}</div>
  </div>
  <div class="row-actions">
    ${featureBtn}
    <button data-action="edit" class="btn btn-secondary">Edit</button>
    ${
      sold
        ? `<button data-action="available" class="btn">Mark available</button>`
        : `<button data-action="sold" class="btn">Mark sold</button>`
    }
    <button data-action="delete" class="btn btn-danger">Delete</button>
  </div>
</article>`;
}

function wireRowButtons(container, docsMap, onEdit) {
  container.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.row');
      const id = row.dataset.id;
      const action = btn.dataset.action;
      const refDoc = doc(db, 'books', id);

      if (action === 'edit') {
        onEdit && onEdit(id, docsMap.get(id));
        return;
      }
      if (action === 'feature') {
        await updateDoc(refDoc, {
          featured: true,
          featuredAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'unfeature') {
        await updateDoc(refDoc, {
          featured: false,
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'sold') {
        await updateDoc(refDoc, {
          status: 'sold',
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'available') {
        await updateDoc(refDoc, {
          status: 'available',
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'delete') {
        if (!confirm('Delete this book permanently? This also deletes images.'))
          return;
        const snap = await getDoc(refDoc);
        const data = snap.data();
        if (data && Array.isArray(data.imagePaths)) {
          for (const p of data.imagePaths) {
            try {
              await deleteObject(ref(storage, p));
            } catch {}
          }
        }
        await deleteDoc(refDoc);
      }
    });
  });
}

const HEADER_SEARCH_MIN_CHARS = 2;

function hasSufficientSearchChars(term = '') {
  return term.replace(/\s+/g, '').length >= HEADER_SEARCH_MIN_CHARS;
}

// ---- public API ----
export function initInventory({
  addForm,
  addMsg,
  availList,
  soldList,
  availableSearchInput = document.getElementById('availableSearchInput'),
  searchStatus = document.getElementById('availableSearchStatus'),
  paginationContainer = document.querySelector('[data-available-pagination]'),
  paginationSummary = document.getElementById('availablePaginationSummary'),
  paginationPrevButton = document.getElementById('availablePaginationPrev'),
  paginationNextButton = document.getElementById('availablePaginationNext'),
  pageSizeSelect = document.getElementById('availablePageSize'),
  supplierSelect,
  onEdit, // optional
  createPaginationController: createPaginationControllerOverride,
}) {
  let supplierEntries = [];
  let supplierIds = new Set();

  function syncSuppliers(list = []) {
    supplierEntries = (Array.isArray(list) ? list : [])
      .slice()
      .sort((a, b) =>
        formatSupplierLabel(a).localeCompare(formatSupplierLabel(b))
      );
    supplierIds = new Set(supplierEntries.map((s) => s.id));
    const select = supplierSelect || addForm?.elements?.supplierId;
    if (!select) return;
    const docRef = select.ownerDocument || document;
    const currentValue = select.value;
    select.innerHTML = '';
    const placeholder = docRef.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Select supplier *';
    select.appendChild(placeholder);
    supplierEntries.forEach((supplier) => {
      const option = docRef.createElement('option');
      option.value = supplier.id;
      option.textContent = formatSupplierLabel(supplier);
      select.appendChild(option);
    });
    select.disabled = supplierEntries.length === 0;
    if (currentValue && supplierIds.has(currentValue)) {
      select.value = currentValue;
    } else {
      select.value = '';
    }
  }
  syncSuppliers();

  // ---- ADD BOOK: submit handler (unchanged) ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (addMsg) addMsg.textContent = 'Uploading…';

    const fd = new FormData(addForm);
    const title = (fd.get('title') || '').toString().trim();
    const author = normalizeAuthorName((fd.get('author') || '').toString());
    const authorKey = author ? authorKeyFromName(author) : null;
    const category = (fd.get('category') || '').toString();
    const binding = (fd.get('binding') || '').toString();
    const priceField = readCurrencyField(fd, 'price');
    const mrpField = readCurrencyField(fd, 'mrp');
    const purchaseField = readCurrencyField(fd, 'purchasePrice');
    const price = priceField.value;
    const mrp = mrpField.value;
    const purchasePrice = purchaseField.value;
    const isbn = onlyDigitsX(fd.get('isbn') || '');
    const condition = (fd.get('condition') || '').toString();
    const descRaw = (fd.get('description') || '').toString();
    const description = stripHtmlAndSquash(descRaw).slice(0, 5000);
    const featured = !!fd.get('featured');
    const supplierId = (fd.get('supplierId') || '').toString().trim();
    const cover = fd.get('cover');
    const more = fd.getAll('more').filter((f) => f && f.size);
    const priceInputEl = addForm?.elements?.price;
    const mrpInputEl = addForm?.elements?.mrp;
    const purchaseInputEl = addForm?.elements?.purchasePrice;

    if (!title || !category || !binding || !cover || !cover.size) {
      if (addMsg)
        addMsg.textContent =
          'Please fill the required fields (Title, Category, Format, Cover).';
      return;
    }

    if (!priceField.hasValue) {
      if (addMsg) addMsg.textContent = 'Price is required.';
      priceInputEl?.focus?.();
      return;
    }
    if (!priceField.isNumeric) {
      if (addMsg) addMsg.textContent = 'Price must be a numeric value.';
      priceInputEl?.focus?.();
      return;
    }
    if (price <= 0) {
      if (addMsg) addMsg.textContent = 'Price must be greater than zero.';
      priceInputEl?.focus?.();
      return;
    }

    if (!mrpField.hasValue) {
      if (addMsg) addMsg.textContent = 'MRP is required.';
      mrpInputEl?.focus?.();
      return;
    }
    if (!mrpField.isNumeric) {
      if (addMsg) addMsg.textContent = 'MRP must be a numeric value.';
      mrpInputEl?.focus?.();
      return;
    }
    if (mrp <= 0) {
      if (addMsg) addMsg.textContent = 'MRP must be greater than zero.';
      mrpInputEl?.focus?.();
      return;
    }

    if (!purchaseField.hasValue) {
      if (addMsg) addMsg.textContent = 'Purchase price is required.';
      purchaseInputEl?.focus?.();
      return;
    }
    if (!purchaseField.isNumeric) {
      if (addMsg)
        addMsg.textContent = 'Purchase price must be a numeric value.';
      purchaseInputEl?.focus?.();
      return;
    }

    if (purchasePrice < 0) {
      if (addMsg)
        addMsg.textContent = 'Purchase price must be zero or positive.';
      purchaseInputEl?.focus?.();
      return;
    }

    if (!supplierId) {
      if (addMsg) addMsg.textContent = 'Please select a supplier.';
      return;
    }

    if (!supplierIds.has(supplierId)) {
      if (addMsg)
        addMsg.textContent =
          'Selected supplier is no longer available. Choose another supplier.';
      return;
    }

    try {
      const res = await addDoc(collection(db, 'books'), {
        title,
        author,
        authorKey,
        category,
        binding,
        isbn,
        price,
        mrp,
        purchasePrice,
        condition,
        description,
        status: 'available',
        featured,
        supplierId,
        ...(featured ? { featuredAt: serverTimestamp() } : {}),
        images: [],
        imagePaths: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const bookId = res.id;

      if (authorKey) {
        await setDoc(
          doc(db, 'authors', authorKey),
          {
            key: authorKey,
            name: author,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      const coverPath = `images/books/${bookId}/cover-${Date.now()}-${
        cover.name
      }`;
      const coverRef = ref(storage, coverPath);
      await uploadBytes(coverRef, cover);
      const coverUrl = await getDownloadURL(coverRef);

      const moreUrls = [],
        morePaths = [];
      for (const file of more) {
        const p = `images/books/${bookId}/img-${Date.now()}-${file.name}`;
        const r = ref(storage, p);
        await uploadBytes(r, file);
        moreUrls.push(await getDownloadURL(r));
        morePaths.push(p);
      }

      await updateDoc(res, {
        images: [coverUrl, ...moreUrls],
        imagePaths: [coverPath, ...morePaths],
        updatedAt: serverTimestamp(),
      });

      addForm.reset();
      if (addMsg) {
        addMsg.textContent = 'Added! It is now live in the catalog.';
        setTimeout(() => (addMsg.textContent = ''), 3000);
      }
    } catch (err) {
      console.error(err);
      if (addMsg) addMsg.textContent = 'Error: ' + err.message;
    }
  };

  addForm?.addEventListener('submit', handleSubmit);

  // ---- live lists + filtering ----
  let currentFilter = '';
  let currentFilterInput = '';
  let searchActive = false;
  let availableDocs = [];
  let availablePageDocs = [];
  let availableFilteredCount = 0;
  let soldDocs = [];
  let lastAnnouncedTerm = '';
  let paginationShellApi = {
    sync() {},
    cleanup() {},
  };

  const buildPaginationController =
    typeof createPaginationControllerOverride === 'function'
      ? createPaginationControllerOverride
      : createPaginationController;

  let paginationController;

  const syncPageSizeSelect = (size) => {
    if (!pageSizeSelect) return;
    const value = String(size ?? AVAILABLE_PAGE_SIZE);
    if (pageSizeSelect.value !== value) {
      pageSizeSelect.value = value;
    }
  };

  const handlePaginationStateChange = () => {
    paginationShellApi.sync?.();
    const uiState = paginationController?.getUiState?.();
    if (uiState?.pageMeta?.pageSize) {
      syncPageSizeSelect(uiState.pageMeta.pageSize);
    }
    paginationController?.syncToLocation?.((params = {}) => {
      updateAvailableLocationHash(params);
    });
  };

  paginationController = buildPaginationController?.({
    dataSource: createLocalAvailablePaginationDataSource({
      getDocs: () => availableDocs.slice(),
      getSearchTerm: () => (searchActive ? currentFilter : ''),
      onPage: (pageItems = [], meta = {}) => {
        availablePageDocs = Array.isArray(pageItems) ? pageItems : [];
        availableFilteredCount = Number.isFinite(meta.totalItems)
          ? meta.totalItems
          : availableFilteredCount;
        renderLists();
        paginationShellApi.sync?.();
      },
    }),
    defaultPageSize: AVAILABLE_PAGE_SIZE,
    initialFilters: { searchTerm: '' },
    onStateChange: handlePaginationStateChange,
  });

  const handlePageSizeChange = (event) => {
    const value = Number(event?.target?.value);
    if (!paginationController?.setPageSize) return;
    if (!Number.isFinite(value) || value <= 0) {
      syncPageSizeSelect(paginationController?.getUiState?.().pageMeta?.pageSize);
      return;
    }
    paginationController.setPageSize(value);
  };

  pageSizeSelect?.addEventListener('change', handlePageSizeChange);

  paginationShellApi = initAvailablePaginationShell({
    container: paginationContainer,
    summaryEl: paginationSummary,
    prevButton: paginationPrevButton,
    nextButton: paginationNextButton,
    controller: paginationController,
  });

  const restoredFromLocation = restorePaginationFromLocation();
  handlePaginationStateChange();
  function reloadAvailablePagination({ reset = false } = {}) {
    if (!paginationController?.setFilters) {
      renderLists();
      return;
    }
    if (reset) {
      paginationController.setFilters({
        searchTerm: searchActive ? currentFilter : '',
        search: searchActive ? currentFilterInput : '',
        refreshToken: Date.now(),
      });
    } else {
      paginationController.refresh?.();
    }
  }

  if (!restoredFromLocation) {
    reloadAvailablePagination({ reset: true });
  }

  function renderLists() {
    const isSearching = searchActive;
    const availableDisplay =
      availablePageDocs.length > 0 ? availablePageDocs : availableDocs;
    const soldDisplay = isSearching
      ? soldDocs.filter((d) => matches(d, currentFilter))
      : soldDocs;

    // Available
    if (availableDisplay.length) {
      const map = new Map(availableDisplay.map((d) => [d.id, d]));
      availList.innerHTML = availableDisplay
        .map((d) => rowHTML(d.id, d, false))
        .join('');
      wireRowButtons(availList, map, onEdit);
    } else {
      availList.innerHTML = `<p class="muted">${
        isSearching ? 'No matches in Available.' : 'No available books.'
      }</p>`;
    }

    // Sold
    if (soldDisplay.length) {
      const map = new Map(soldDisplay.map((d) => [d.id, d]));
      soldList.innerHTML = soldDisplay
        .map((d) => rowHTML(d.id, d, true))
        .join('');
      wireRowButtons(soldList, map, onEdit);
    } else {
      soldList.innerHTML = `<p class="muted">${
        isSearching ? 'No matches in Sold.' : 'No sold books.'
      }</p>`;
    }
  }

  // snapshots (unchanged queries)
  const qAvail = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  const qSold = query(
    collection(db, 'books'),
    where('status', '==', 'sold'),
    orderBy('updatedAt', 'desc')
  );

  const unsubscribeAvail = onSnapshot(qAvail, (snap) => {
    availableDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!searchActive) {
      availableFilteredCount = availableDocs.length;
    }
    reloadAvailablePagination({ reset: false });
  });
  const unsubscribeSold = onSnapshot(qSold, (snap) => {
    soldDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderLists();
  });

  // expose to main.js
  const handleAvailableSearchInput = (event) => {
    const value = event?.target?.value ?? '';
    applyHeaderSearch(value);
  };

  availableSearchInput?.addEventListener('input', handleAvailableSearchInput);
  if (availableSearchInput?.value) {
    applyHeaderSearch(availableSearchInput.value, { announce: false });
  }

  return {
    setFilter(term = '', options = {}) {
      applyHeaderSearch(term, options);
    },
    setSuppliers(list = []) {
      syncSuppliers(list);
    },
    dispose() {
      addForm?.removeEventListener('submit', handleSubmit);
      unsubscribeAvail?.();
      unsubscribeSold?.();
      availableSearchInput?.removeEventListener(
        'input',
        handleAvailableSearchInput
      );
      paginationShellApi.cleanup?.();
      pageSizeSelect?.removeEventListener('change', handlePageSizeChange);
    },
  };

  function applyHeaderSearch(term = '', options = {}) {
    const rawTerm = String(term ?? '');
    const trimmedTerm = rawTerm.trim();
    const normalizedTerm = trimmedTerm.toLowerCase();
    const isLongEnough = hasSufficientSearchChars(trimmedTerm);
    const announce = options.announce ?? true;

    if (!isLongEnough) {
      currentFilter = '';
      currentFilterInput = '';
      searchActive = false;
      availableFilteredCount = availableDocs.length;
      reloadAvailablePagination({ reset: true });
      renderLists();
      if (announce) {
        clearSearchStatus();
      }
      return;
    }

    currentFilter = normalizedTerm;
    currentFilterInput = trimmedTerm;
    searchActive = true;
    const matchesCount = filterAvailableDocs(availableDocs, normalizedTerm).length;
    availableFilteredCount = matchesCount;
    reloadAvailablePagination({ reset: true });
    renderLists();
    if (announce) {
      announceFilteredResults(trimmedTerm, matchesCount);
    }
  }

  function announceFilteredResults(term, count) {
    if (!searchStatus) return;
    const safeCount = Number.isFinite(count) ? count : availableFilteredCount;
    searchStatus.textContent = `Filtered ${safeCount} results for '${term}'`;
    lastAnnouncedTerm = term;
  }

  function clearSearchStatus() {
    if (!searchStatus) return;
    if (!lastAnnouncedTerm && !searchStatus.textContent) return;
    searchStatus.textContent = '';
    lastAnnouncedTerm = '';
  }

  function restorePaginationFromLocation() {
    if (typeof window === 'undefined' || !paginationController) return false;
    const search = extractAvailableHashQuery(window.location.hash || '');
    if (!search) {
      return false;
    }
    const params = new URLSearchParams(
      search.startsWith('?') ? search.slice(1) : search
    );
    const rawTerm = params.get('search') || '';
    if (rawTerm) {
      currentFilterInput = rawTerm;
      currentFilter = rawTerm.trim().toLowerCase();
      searchActive = hasSufficientSearchChars(rawTerm);
      if (availableSearchInput) {
        availableSearchInput.value = rawTerm;
      }
    }
    const parsedPageSize = Number(params.get('pageSize'));
    if (Number.isFinite(parsedPageSize) && parsedPageSize > 0) {
      syncPageSizeSelect(parsedPageSize);
    }
    paginationController.syncFromLocation?.({
      search,
      totalItems: availableFilteredCount,
    });
    return true;
  }

  function extractAvailableHashQuery(hash = '') {
    if (typeof hash !== 'string') return '';
    const base = '#manage-books/available';
    if (!hash.startsWith(base)) return '';
    const idx = hash.indexOf('?');
    return idx >= 0 ? hash.slice(idx) : '';
  }

  function updateAvailableLocationHash(params = {}) {
    if (typeof window === 'undefined') return;
    const query = buildAvailableHashQuery(params);
    const base = '#manage-books/available';
    const nextHash = query ? `${base}${query}` : base;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function buildAvailableHashQuery(params = {}) {
    const searchParams = new URLSearchParams();
    const safePageSize =
      Number.isFinite(params.pageSize) && params.pageSize > 0
        ? params.pageSize
        : AVAILABLE_PAGE_SIZE;
    const safeOffset =
      Number.isFinite(params.offset) && params.offset >= 0
        ? params.offset
        : 0;
    const safePage =
      Number.isFinite(params.page) && params.page > 0
        ? params.page
        : Math.floor(safeOffset / safePageSize) + 1;
    searchParams.set('page', safePage);
    searchParams.set('pageSize', safePageSize);
    searchParams.set('offset', safeOffset);
    const filters = params.filters || {};
    const searchTermParam =
      filters.search ??
      filters.searchTerm ??
      (searchActive ? currentFilterInput : '');
    if (searchTermParam) {
      searchParams.set('search', searchTermParam);
    }
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  function filterAvailableDocs(list = [], term = '') {
    if (!term) {
      return Array.isArray(list) ? list.slice() : [];
    }
    const normalized = String(term).toLowerCase();
    return (Array.isArray(list) ? list : []).filter((doc) =>
      matches(doc, normalized)
    );
  }

  function createLocalAvailablePaginationDataSource({
    getDocs,
    getSearchTerm,
    onPage,
  }) {
    return function dataSource({ request = {}, filters = {}, offset = 0 }) {
      const pageSize =
        Number.isFinite(request.pageSize) && request.pageSize > 0
          ? request.pageSize
          : AVAILABLE_PAGE_SIZE;
      const direction =
        request.direction === 'backward' ? 'backward' : 'forward';
      const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
      const currentOffset =
        Number.isFinite(request.currentOffset) && request.currentOffset >= 0
          ? request.currentOffset
          : safeOffset;
      const desiredTerm =
        filters.searchTerm ??
        filters.search ??
        (typeof getSearchTerm === 'function' ? getSearchTerm() : '') ??
        '';
      const sourceDocs =
        typeof getDocs === 'function' ? getDocs() : availableDocs;
      const filteredDocs = filterAvailableDocs(sourceDocs, desiredTerm);
      const startIndex =
        direction === 'backward'
          ? Math.max(0, currentOffset - pageSize)
          : safeOffset;
      const pageItems = filteredDocs.slice(startIndex, startIndex + pageSize);
      onPage &&
        onPage(pageItems, {
          totalItems: filteredDocs.length,
          startIndex,
        });
      const hasNext = startIndex + pageItems.length < filteredDocs.length;
      const hasPrev = startIndex > 0;
      const nextOffset = Math.min(
        filteredDocs.length,
        startIndex + pageItems.length
      );
      return {
        items: pageItems,
        pageMeta: {
          pageSize,
          count: pageItems.length,
          hasNext,
          hasPrev,
          cursors: {
            start: pageItems[0] || null,
            end: pageItems[pageItems.length - 1] || null,
          },
        },
        offset: nextOffset,
        currentOffset: startIndex,
        totalItems: filteredDocs.length,
      };
    };
  }

  function initAvailablePaginationShell({
    container,
    summaryEl,
    prevButton,
    nextButton,
    controller,
  }) {
    const summary =
      summaryEl || container?.querySelector('#availablePaginationSummary');
    const prev =
      prevButton || container?.querySelector('[data-pagination="prev"]');
    const next =
      nextButton || container?.querySelector('[data-pagination="next"]');
    const doc =
      container?.ownerDocument ||
      (typeof document !== 'undefined' ? document : null);
    if (!container || !summary || !prev || !next || !controller || !doc) {
      return {
        sync() {},
        cleanup() {},
      };
    }

    let pages = container.querySelector('[data-pagination-pages]');
    if (!pages) {
      pages = doc.createElement('div');
      pages.setAttribute('data-pagination-pages', '');
      pages.classList.add('inventory-pagination__pages');
      pages.hidden = true;
    }
    if (pages) {
      const host = prev.parentElement || container;
      if (host) {
        const referenceNode =
          next.parentElement === host ? next : prev.nextSibling;
        host.insertBefore(pages, referenceNode || null);
      }
      pages.classList.add('inventory-pagination__pages');
      if (typeof pages.hidden !== 'boolean') {
        pages.hidden = true;
      }
      pages.setAttribute('role', 'group');
      pages.setAttribute('aria-label', 'Page selection');
    }

    const derivePageSize = (state = {}) => {
      const metaSize = state.pageMeta?.pageSize;
      return Number.isFinite(metaSize) && metaSize > 0 ? metaSize : 0;
    };

    const deriveTotalPages = (state = {}) => {
      if (Number.isFinite(state.totalPages) && state.totalPages > 0) {
        return state.totalPages;
      }
      const size = derivePageSize(state);
      if (!size) return 0;
      const total =
        Number.isFinite(state.totalItems) && state.totalItems >= 0
          ? state.totalItems
          : Number.isFinite(state.pageMeta?.count) && state.pageMeta.count >= 0
          ? state.pageMeta.count
          : 0;
      if (total <= 0) return 1;
      return Math.max(1, Math.ceil(total / size));
    };

    const deriveCurrentPage = (state = {}, totalPages = 1) => {
      if (Number.isFinite(state.currentPage) && state.currentPage > 0) {
        return Math.min(totalPages || 1, state.currentPage);
      }
      const size = derivePageSize(state);
      if (!size) return 1;
      const offset =
        Number.isFinite(state.currentOffset) && state.currentOffset >= 0
          ? state.currentOffset
          : 0;
      return Math.min(totalPages || 1, Math.floor(offset / size) + 1);
    };

    const renderNumericButtons = (state = {}) => {
      if (!pages) return;
      const totalPages = deriveTotalPages(state);
      if (!totalPages || totalPages <= 1) {
        pages.replaceChildren();
        pages.hidden = true;
        return;
      }
      const currentPage = deriveCurrentPage(state, totalPages);
      const maxVisibleButtons = 7;

      const hydrateButton = (button, pageNumber) => {
        button.dataset.pageButton = String(pageNumber);
        button.textContent = String(pageNumber);
        button.setAttribute('aria-label', `Go to page ${pageNumber}`);
        if (pageNumber === currentPage) {
          button.setAttribute('aria-current', 'page');
        } else {
          button.removeAttribute('aria-current');
        }
        button.disabled = Boolean(state.isBusy);
      };

      if (totalPages <= maxVisibleButtons) {
        pages
          .querySelectorAll('.pagination-ellipsis')
          .forEach((node) => node.remove());
        let buttons = Array.from(pages.querySelectorAll('button'));
        while (buttons.length < totalPages) {
          const button = doc.createElement('button');
          button.type = 'button';
          pages.appendChild(button);
          buttons.push(button);
        }
        while (buttons.length > totalPages) {
          const button = buttons.pop();
          button?.remove();
        }
        buttons = Array.from(pages.querySelectorAll('button'));
        buttons.forEach((button, index) => {
          hydrateButton(button, index + 1);
        });
        pages.hidden = false;
        return;
      }

      const fragment = doc.createDocumentFragment();
      const createPageButton = (pageNumber) => {
        const button = doc.createElement('button');
        button.type = 'button';
        hydrateButton(button, pageNumber);
        fragment.appendChild(button);
      };
      const createEllipsis = () => {
        const ellipsis = doc.createElement('span');
        ellipsis.className = 'pagination-ellipsis';
        ellipsis.textContent = '…';
        ellipsis.setAttribute('aria-hidden', 'true');
        fragment.appendChild(ellipsis);
      };
      const visiblePages = new Set([1, totalPages, currentPage]);
      for (let offset = 1; offset <= 2; offset += 1) {
        const prevPageNumber = currentPage - offset;
        const nextPageNumber = currentPage + offset;
        if (prevPageNumber > 1) visiblePages.add(prevPageNumber);
        if (nextPageNumber < totalPages) visiblePages.add(nextPageNumber);
      }
      const sortedPages = Array.from(visiblePages).sort((a, b) => a - b);
      let lastPage = null;
      sortedPages.forEach((pageNumber) => {
        if (lastPage !== null && pageNumber - lastPage > 1) {
          createEllipsis();
        }
        createPageButton(pageNumber);
        lastPage = pageNumber;
      });
      pages.replaceChildren();
      pages.appendChild(fragment);
      pages.hidden = false;
    };

    const updateUi = () => {
      if (!controller?.getUiState) return;
      const state = controller.getUiState() || {};
      const summaryText = state.summaryText || 'Items 0–0 of 0';
      summary.textContent = `${summaryText} available books`;
      summary.setAttribute(
        'aria-live',
        summary.getAttribute('aria-live') || 'polite',
      );
      container.setAttribute('aria-busy', state.isBusy ? 'true' : 'false');
      container.dataset.loading = state.isBusy ? 'true' : 'false';
      const disablePrev = state.prevDisabled || state.isBusy;
      const disableNext = state.nextDisabled || state.isBusy;
      prev.disabled = Boolean(disablePrev);
      next.disabled = Boolean(disableNext);
      prev.setAttribute('aria-disabled', String(Boolean(disablePrev)));
      next.setAttribute('aria-disabled', String(Boolean(disableNext)));
      renderNumericButtons(state);
    };

    const handlePrev = () => {
      if (prev.disabled) return;
      controller.goPrev?.();
      updateUi();
    };
    const handleNext = () => {
      if (next.disabled) return;
      controller.goNext?.();
      updateUi();
    };

    const handlePageButtonClick = (event) => {
      if (!pages || typeof controller?.goToPage !== 'function') return;
      const target = event.target?.closest?.('button[data-page-button]');
      if (!target || target.disabled) return;
      const pageNumber = Number.parseInt(target.dataset.pageButton || '', 10);
      if (!Number.isFinite(pageNumber)) return;
      const state = controller.getUiState?.() || {};
      if (state.isBusy) return;
      const currentPage = deriveCurrentPage(state, deriveTotalPages(state));
      if (pageNumber === currentPage) return;
      controller.goToPage(pageNumber);
      updateUi();
    };

    prev.addEventListener('click', handlePrev);
    next.addEventListener('click', handleNext);
    pages?.addEventListener('click', handlePageButtonClick);
    updateUi();

    return {
      sync: updateUi,
      cleanup() {
        prev.removeEventListener('click', handlePrev);
        next.removeEventListener('click', handleNext);
        pages?.removeEventListener('click', handlePageButtonClick);
      },
    };
  }
}
