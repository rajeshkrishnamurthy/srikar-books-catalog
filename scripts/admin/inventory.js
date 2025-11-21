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
import { mount as mountInlineBundlePanelShell } from '../../src/ui/patterns/inline-bundle-panel-shell/index.js';
import { createInlineBundleComposerController } from '../../src/ui/patterns/inline-bundle-composer-controller/index.js';

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
const SOLD_PAGE_SIZE = 20;

const toMinor = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100);
};

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
  const addToBundleBtn = sold
    ? ''
    : `<button
        type="button"
        class="btn btn-secondary"
        data-action="addToBundle"
        data-test="bookAddToBundle"
        aria-controls="inlineBundleComposer"
        aria-expanded="false"
        aria-pressed="false"
      >
        Add to bundle
      </button>`;

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
    ${addToBundleBtn}
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

function wireRowButtons(container, docsMap, onEdit, options = {}) {
  const { onAddToBundle } = options;
  container.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.row');
      const id = row?.dataset?.id;
      const action = btn.dataset.action;
      if (!row || !id || !action) return;
      if (action === 'addToBundle') {
        const primary = docsMap.get(id) || {};
        const fallbackTitle =
          row.querySelector('strong')?.textContent?.trim() || '';
        const normalizedBook =
          primary && typeof primary === 'object'
            ? { ...primary }
            : { id, title: fallbackTitle };
        if (!normalizedBook.id) {
          normalizedBook.id = id;
        }
        if (!normalizedBook.title && fallbackTitle) {
          normalizedBook.title = fallbackTitle;
        }
        onAddToBundle?.(normalizedBook, btn);
        return;
      }
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
  soldPanel = document.getElementById('soldBooksPanel'),
  availableSearchInput = document.getElementById('availableSearchInput'),
  searchStatus = document.getElementById('availableSearchStatus'),
  paginationContainer = document.querySelector('[data-available-pagination]'),
  paginationSummary = document.getElementById('availablePaginationSummary'),
  paginationPrevButton = document.getElementById('availablePaginationPrev'),
  paginationNextButton = document.getElementById('availablePaginationNext'),
  pageSizeSelect = document.getElementById('availablePageSize'),
  soldPaginationContainer = document.querySelector('[data-sold-pagination]'),
  soldPaginationSummary = document.getElementById('soldPaginationSummary'),
  soldPaginationPrevButton = document.getElementById('soldPaginationPrev'),
  soldPaginationNextButton = document.getElementById('soldPaginationNext'),
  soldPageSizeSelect = document.getElementById('soldPageSize'),
  supplierSelect,
  onEdit, // optional
  createPaginationController: createPaginationControllerOverride,
}) {
  const inlineBundleRecommended = document.getElementById('inlineBundleRecommended');
  const inlineBundleTotal = document.getElementById('inlineBundleTotal');
  const inlineBundleMrp = document.getElementById('inlineBundleMrp');
  const inlineBundleNameInput = document.getElementById('inlineBundleName');
  const inlineBundlePriceInput = document.getElementById('inlineBundlePrice');
  const inlineBundleSaveButton = document.getElementById('inlineBundleSave');
  const inlineBundleContainer = document.getElementById('inlineBundleComposer');

  const formatMinorToRupee = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `₹${(Number(value) / 100).toFixed(2)}`;
  };

  const renderBundlePricing = (state = {}) => {
    const hasBooks = Array.isArray(state.books) && state.books.length > 0;
    const meetsThreshold = hasBooks && state.books.length >= 2;
    const hasRecommendation =
      meetsThreshold && (Number.isFinite(state.recommendedPriceMinor) || state.recommendedPriceMinor === 0);
    const hasTotal =
      meetsThreshold && (Number.isFinite(state.totalSalePriceMinor) || state.totalSalePriceMinor === 0);

    if (inlineBundleRecommended) {
      inlineBundleRecommended.textContent = hasRecommendation
        ? formatMinorToRupee(state.recommendedPriceMinor)
        : '—';
    }
    if (inlineBundleTotal) {
      inlineBundleTotal.textContent = hasTotal ? formatMinorToRupee(state.totalSalePriceMinor) : '—';
    }
    if (inlineBundleMrp) {
      const hasMrp =
        meetsThreshold && (Number.isFinite(state.totalMrpMinor) || state.totalMrpMinor === 0);
      inlineBundleMrp.textContent = hasMrp
        ? formatMinorToRupee(state.totalMrpMinor)
        : 'Total MRP unavailable';
    }

    const nameReady = typeof state.bundleName === 'string' && state.bundleName.trim().length > 0;
    const priceReady = Number.isFinite(state.bundlePriceMinor) && state.bundlePriceMinor > 0;
    const canSave =
      hasBooks && nameReady && priceReady && !state.isSaving;
    if (inlineBundleSaveButton) {
      inlineBundleSaveButton.disabled = !canSave;
    }
    if (inlineBundleContainer) {
      if (state.isSaving) {
        inlineBundleContainer.setAttribute('aria-busy', 'true');
      } else {
        inlineBundleContainer.removeAttribute('aria-busy');
      }
    }
  };

  let inlineBundleController;
  const fetchPriceRecommendation = async ({ bookIds = [] } = {}) => {
    const selection = inlineBundleController?.getState?.()?.books || [];
    const ids = Array.isArray(bookIds) && bookIds.length ? new Set(bookIds) : null;
    const scoped = ids ? selection.filter((book) => ids.has(book.id)) : selection;
    const totalSaleMinor = scoped.reduce(
      (sum, book) => sum + (Number(book?.salePriceMinor) || 0),
      0
    );
    const hasAllMrp = scoped.length > 0 && scoped.every((book) => Number.isFinite(book?.mrpMinor));
    const totalMrpMinor = hasAllMrp
      ? scoped.reduce((sum, book) => sum + (Number(book?.mrpMinor) || 0), 0)
      : null;
    const recommendedMinor = Math.round(totalSaleMinor * 0.75);
    return {
      recommendedPriceMinor: recommendedMinor,
      totalSalePriceMinor: totalSaleMinor,
      totalMrpMinor,
    };
  };

  const saveInlineBundle = async (payload = {}) => {
    const state = inlineBundleController?.getState?.() || {};
    const bundleName = (payload.bundleName || state.bundleName || '').trim();
    const bundlePriceMinor = Number.isFinite(payload.bundlePriceMinor)
      ? payload.bundlePriceMinor
      : state.bundlePriceMinor;
    const bookIds = Array.isArray(payload.bookIds) && payload.bookIds.length
      ? payload.bookIds
      : (state.books || []).map((book) => book.id);

    if (!bundleName || !Number.isFinite(bundlePriceMinor) || bundlePriceMinor <= 0 || !bookIds.length) {
      throw new Error('Invalid inline bundle payload');
    }

    const totalListMinor =
      Number.isFinite(state.totalSalePriceMinor) && state.totalSalePriceMinor >= 0
        ? state.totalSalePriceMinor
        : (state.books || []).reduce((sum, book) => sum + (Number(book?.salePriceMinor) || 0), 0);
    const recommendedMinor =
      Number.isFinite(state.recommendedPriceMinor) && state.recommendedPriceMinor >= 0
        ? state.recommendedPriceMinor
        : Math.round(totalListMinor * 0.75);

    const books = (state.books || []).map((book, index) => ({
      id: book.id,
      title: book.title,
      price: Math.round((Number(book.salePriceMinor) || 0) / 100),
      supplierId: book.supplierId || '',
      position: index + 1,
    }));

    const bundleDoc = {
      title: bundleName,
      bookIds,
      books,
      totalListPriceRupees: Math.round(totalListMinor / 100),
      recommendedPriceRupees: Math.round(recommendedMinor / 100),
      bundlePriceRupees: Math.round(bundlePriceMinor / 100),
      status: 'Draft',
      createdAt: typeof serverTimestamp === 'function' ? serverTimestamp() : new Date(),
    };

    const ref = await addDoc(collection(db, 'bundles'), bundleDoc);
    return { bundleId: ref?.id };
  };

  const linkInlineBundleBooks = async (bundleId, bookIds = []) => {
    if (!bundleId || !Array.isArray(bookIds) || bookIds.length === 0) {
      return;
    }
    const updates = bookIds.map((id) => {
      const docRef = doc(db, 'books', id);
      return updateDoc(docRef, { bundleId, updatedAt: serverTimestamp() }).catch(() => {});
    });
    await Promise.all(updates);
  };

  inlineBundleController = createInlineBundleComposerController({
    params: {
      currency: 'INR',
      pricePrecision: 2,
      recommendationThreshold: 2,
    },
    adapters: {
      fetchPriceRecommendation,
      saveBundle: saveInlineBundle,
      linkBooks: linkInlineBundleBooks,
      onStateChange: renderBundlePricing,
    },
  });

  renderBundlePricing(inlineBundleController.getState());

  const syncControllerBookAdd = (book = {}) => {
    inlineBundleController?.addBook?.({
      id: book.id,
      title: book.title,
      salePriceMinor: toMinor(book.salePriceMinor ?? book.price),
      mrpMinor: toMinor(book.mrpMinor ?? book.mrp),
      supplierId: book.supplierId,
    });
  };

  const handleInlineBundleName = (event) => {
    inlineBundleController?.updateFields?.({ bundleName: event?.target?.value || '' });
  };

  const handleInlineBundlePrice = (event) => {
    const raw = event?.target?.value ?? '';
    const minor = toMinor(raw);
    inlineBundleController?.updateFields?.({ bundlePriceMinor: minor });
  };

  const handleInlineBundleSave = (event) => {
    event?.preventDefault?.();
    inlineBundleController?.saveBundle?.().catch((error) => console.error('inline bundle save failed', error));
  };

  inlineBundleNameInput?.addEventListener('input', handleInlineBundleName);
  inlineBundlePriceInput?.addEventListener('input', handleInlineBundlePrice);
  inlineBundleSaveButton?.addEventListener('click', handleInlineBundleSave);

  let supplierEntries = [];
  let supplierIds = new Set();
  const inlineBundleComposerApi = mountInlineBundlePanelShell(
    document.getElementById('inlineBundleComposer'),
    {
      params: {
        container: document.getElementById('inlineBundleComposer'),
        panelHeading: document.getElementById('inlineBundleHeading'),
        triggerSelector: "[data-test='bookAddToBundle']",
        bookList: document.getElementById('inlineBundleSelectedBooks'),
        bundleNameInput: document.getElementById('inlineBundleName'),
        bundlePriceInput: document.getElementById('inlineBundlePrice'),
        recommendedPrice: document.getElementById('inlineBundleRecommended'),
        totalPrice: document.getElementById('inlineBundleTotal'),
        saveButton: document.getElementById('inlineBundleSave'),
        resetButton: document.getElementById('inlineBundleReset'),
        emptyState: document.getElementById('inlineBundleEmptyState'),
        closeButton: document.getElementById('inlineBundleClose'),
      },
      uiTexts: {
        panelTitle: 'Bundle in progress',
        emptyState: 'Add a book to start a bundle',
        saveLabel: 'Save bundle',
        resetLabel: 'Clear bundle',
      },
      options: {
        selectionCallbacks: {
          onAddBook: syncControllerBookAdd,
          onRemoveBook: (book) => inlineBundleController?.removeBook?.(book?.id),
          onReset: () => inlineBundleController?.reset?.(),
        },
      },
    }
  );

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
  let soldPageDocs = [];
  let soldFilteredCount = 0;
  let lastAnnouncedTerm = '';
  let paginationShellApi = {
    sync() {},
    cleanup() {},
  };
  let soldPaginationShellApi = {
    sync() {},
    cleanup() {},
  };

  const buildPaginationController =
    typeof createPaginationControllerOverride === 'function'
      ? createPaginationControllerOverride
      : createPaginationController;

  let paginationController;
  let soldPaginationController;
  const shouldSyncSoldHash = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location?.hash || '';
      if (hash.startsWith('#manage-books/sold')) {
        return true;
      }
      if (hash.startsWith('#manage-books/')) {
        return false;
      }
    }
    if (!soldPanel) return true;
    if (soldPanel.hidden === true) {
      return false;
    }
    if (typeof soldPanel.open === 'boolean') {
      return soldPanel.open;
    }
    return true;
  };

  const syncPageSizeSelect = (size) => {
    if (!pageSizeSelect) return;
    const value = String(size ?? AVAILABLE_PAGE_SIZE);
    if (pageSizeSelect.value !== value) {
      pageSizeSelect.value = value;
    }
  };
  const syncSoldPageSizeSelect = (size) => {
    if (!soldPageSizeSelect) return;
    const value = String(size ?? SOLD_PAGE_SIZE);
    if (soldPageSizeSelect.value !== value) {
      soldPageSizeSelect.value = value;
    }
  };

  function initInventoryPaginationSection({
    getDocs,
    onPage,
    defaultPageSize,
    pageSizeSelect: selectEl,
    syncPageSizeSelect: syncSelect,
    shellNodes,
    summaryFormatter,
    shouldSyncHash = () => true,
    updateLocationHash,
  }) {
    let controller;
    let shellApi = {
      sync() {},
      cleanup() {},
    };

    const handleStateChange = () => {
      shellApi.sync?.();
      const uiState = controller?.getUiState?.();
      if (uiState?.pageMeta?.pageSize) {
        syncSelect?.(uiState.pageMeta.pageSize);
      }
      if (!shouldSyncHash()) {
        return;
      }
      controller?.syncToLocation?.((params = {}) => {
        if (!shouldSyncHash()) {
          return;
        }
        updateLocationHash?.(params);
      });
    };

    controller = buildPaginationController?.({
      dataSource: createLocalAvailablePaginationDataSource({
        getDocs,
        getSearchTerm: () => (searchActive ? currentFilter : ''),
        onPage: (pageItems = [], meta = {}) => {
          onPage(Array.isArray(pageItems) ? pageItems : [], meta);
          shellApi.sync?.();
        },
      }),
      defaultPageSize,
      initialFilters: { searchTerm: '' },
      onStateChange: handleStateChange,
    });

    const handlePageSizeChange = (event) => {
      const value = Number(event?.target?.value);
      if (!controller?.setPageSize) return;
      if (!Number.isFinite(value) || value <= 0) {
        const fallbackPageSize = controller?.getUiState?.().pageMeta?.pageSize;
        syncSelect?.(fallbackPageSize);
        return;
      }
      controller.setPageSize(value);
    };

    selectEl?.addEventListener('change', handlePageSizeChange);

    shellApi = initPaginationShell({
      container: shellNodes?.container,
      summaryEl: shellNodes?.summaryEl,
      prevButton: shellNodes?.prevButton,
      nextButton: shellNodes?.nextButton,
      controller,
      summaryFormatter,
    });

    const reload = ({ reset = false } = {}) => {
      if (!controller?.setFilters) {
        renderLists();
        return;
      }
      if (reset) {
        controller.setFilters({
          searchTerm: searchActive ? currentFilter : '',
          search: searchActive ? currentFilterInput : '',
          refreshToken: Date.now(),
        });
      } else {
        controller.refresh?.();
      }
    };

    return {
      controller,
      shellApi,
      reload,
      syncState: handleStateChange,
      handlePageSizeChange,
    };
  }

  const availablePagination = initInventoryPaginationSection({
    getDocs: () => availableDocs.slice(),
    onPage: (pageItems = [], meta = {}) => {
      availablePageDocs = pageItems;
      availableFilteredCount = Number.isFinite(meta.totalItems)
        ? meta.totalItems
        : availableFilteredCount;
      renderLists();
    },
    defaultPageSize: AVAILABLE_PAGE_SIZE,
    pageSizeSelect,
    syncPageSizeSelect,
    shellNodes: {
      container: paginationContainer,
      summaryEl: paginationSummary,
      prevButton: paginationPrevButton,
      nextButton: paginationNextButton,
    },
    summaryFormatter: (text) => `${text} available books`,
    updateLocationHash: updateAvailableLocationHash,
  });

  paginationController = availablePagination.controller;
  paginationShellApi = availablePagination.shellApi;
  const reloadAvailablePagination = availablePagination.reload;
  const handlePageSizeChange = availablePagination.handlePageSizeChange;
  const syncAvailablePaginationState = availablePagination.syncState;

  const restoredFromLocation = restorePaginationFromLocation();
  syncAvailablePaginationState();
  if (!restoredFromLocation) {
    reloadAvailablePagination({ reset: true });
  }

  const soldPagination = initInventoryPaginationSection({
    getDocs: () => soldDocs.slice(),
    onPage: (pageItems = [], meta = {}) => {
      soldPageDocs = pageItems;
      soldFilteredCount = Number.isFinite(meta.totalItems)
        ? meta.totalItems
        : soldFilteredCount;
      renderLists();
    },
    defaultPageSize: SOLD_PAGE_SIZE,
    pageSizeSelect: soldPageSizeSelect,
    syncPageSizeSelect: syncSoldPageSizeSelect,
    shellNodes: {
      container: soldPaginationContainer,
      summaryEl: soldPaginationSummary,
      prevButton: soldPaginationPrevButton,
      nextButton: soldPaginationNextButton,
    },
    summaryFormatter: (text) => `${text} - Sold`,
    shouldSyncHash: () => shouldSyncSoldHash(),
    updateLocationHash: updateSoldLocationHash,
  });

  soldPaginationController = soldPagination.controller;
  soldPaginationShellApi = soldPagination.shellApi;
  const reloadSoldPagination = soldPagination.reload;
  const handleSoldPageSizeChange = soldPagination.handlePageSizeChange;
  const syncSoldPaginationState = soldPagination.syncState;

  const restoredSoldFromLocation = restoreSoldPaginationFromLocation();
  syncSoldPaginationState();
  if (!restoredSoldFromLocation) {
    reloadSoldPagination({ reset: true });
  }

  function renderLists() {
    const isSearching = searchActive;
    const availableDisplay =
      availablePageDocs.length > 0 ? availablePageDocs : availableDocs;
    const soldDisplay = soldPageDocs.length > 0
      ? soldPageDocs
      : isSearching
      ? soldDocs.filter((d) => matches(d, currentFilter))
      : soldDocs;

    // Available
    if (availableDisplay.length) {
      const map = new Map(availableDisplay.map((d) => [d.id, d]));
      availList.innerHTML = availableDisplay
        .map((d) => rowHTML(d.id, d, false))
        .join('');
      wireRowButtons(availList, map, onEdit, {
        onAddToBundle: (book, triggerBtn) =>
          inlineBundleComposerApi.addBook(book, triggerBtn),
      });
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
    if (!searchActive) {
      soldFilteredCount = soldDocs.length;
    }
    reloadSoldPagination({ reset: false });
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
      soldPaginationShellApi.cleanup?.();
      pageSizeSelect?.removeEventListener('change', handlePageSizeChange);
      soldPageSizeSelect?.removeEventListener('change', handleSoldPageSizeChange);
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
      soldFilteredCount = soldDocs.length;
      reloadAvailablePagination({ reset: true });
      reloadSoldPagination({ reset: true });
      renderLists();
      if (announce) {
        clearSearchStatus();
      }
      return;
    }

    currentFilter = normalizedTerm;
    currentFilterInput = trimmedTerm;
    searchActive = true;
    const availableMatches = filterAvailableDocs(availableDocs, normalizedTerm);
    const soldMatches = filterAvailableDocs(soldDocs, normalizedTerm);
    availableFilteredCount = availableMatches.length;
    soldFilteredCount = soldMatches.length;
    const totalMatches = availableMatches.length + soldMatches.length;
    reloadAvailablePagination({ reset: true });
    reloadSoldPagination({ reset: true });
    renderLists();
    if (announce) {
      announceFilteredResults(trimmedTerm, totalMatches);
    }
  }

  function announceFilteredResults(term, count) {
    if (!searchStatus) return;
    const safeCount = Number.isFinite(count)
      ? count
      : availableFilteredCount + soldFilteredCount;
    searchStatus.textContent = `Filtered ${safeCount} results for '${term}'`;
    lastAnnouncedTerm = term;
  }

  function clearSearchStatus() {
    if (!searchStatus) return;
    if (!lastAnnouncedTerm && !searchStatus.textContent) return;
    searchStatus.textContent = '';
    lastAnnouncedTerm = '';
  }

  function createSearchParamsFromHash(search = '') {
    const raw = typeof search === 'string' ? search : '';
    const scopedSearch = raw.startsWith('?') ? raw.slice(1) : raw;
    return new URLSearchParams(scopedSearch);
  }

  function syncSearchStateFromParams(params) {
    if (!params) return;
    const rawTerm = params.get('search') || '';
    if (!rawTerm) {
      return;
    }
    currentFilterInput = rawTerm;
    currentFilter = rawTerm.trim().toLowerCase();
    searchActive = hasSufficientSearchChars(rawTerm);
    if (availableSearchInput) {
      availableSearchInput.value = rawTerm;
    }
  }

  function restorePaginationFromLocation() {
    if (typeof window === 'undefined' || !paginationController) return false;
    const search = extractAvailableHashQuery(window.location.hash || '');
    if (!search) {
      return false;
    }
    const params = createSearchParamsFromHash(search);
    syncSearchStateFromParams(params);
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
      params.search ??
      params.searchTerm ??
      filters.search ??
      filters.searchTerm ??
      (searchActive ? currentFilterInput : '');
    if (searchTermParam) {
      searchParams.set('search', searchTermParam);
    }
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  function restoreSoldPaginationFromLocation() {
    if (typeof window === 'undefined' || !soldPaginationController) return false;
    const search = extractSoldHashQuery(window.location.hash || '');
    if (!search) {
      return false;
    }
    const params = createSearchParamsFromHash(search);
    syncSearchStateFromParams(params);
    const parsedPageSize = Number(params.get('pageSize'));
    if (Number.isFinite(parsedPageSize) && parsedPageSize > 0) {
      syncSoldPageSizeSelect(parsedPageSize);
    }
    soldPaginationController.syncFromLocation?.({
      search,
      totalItems: soldFilteredCount,
    });
    return true;
  }

  function extractSoldHashQuery(hash = '') {
    if (typeof hash !== 'string') return '';
    const base = '#manage-books/sold';
    if (!hash.startsWith(base)) return '';
    const idx = hash.indexOf('?');
    return idx >= 0 ? hash.slice(idx) : '';
  }

  function updateSoldLocationHash(params = {}) {
    if (typeof window === 'undefined') return;
    const query = buildSoldHashQuery(params);
    const base = '#manage-books/sold';
    const nextHash = query ? `${base}${query}` : base;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function buildSoldHashQuery(params = {}) {
    const searchParams = new URLSearchParams();
    const safePageSize =
      Number.isFinite(params.pageSize) && params.pageSize > 0
        ? params.pageSize
        : SOLD_PAGE_SIZE;
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
      params.search ??
      params.searchTerm ??
      filters.search ??
      filters.searchTerm ??
      (searchActive ? currentFilterInput : '');
    if (searchTermParam) {
      searchParams.set('search', searchTermParam);
    }
    const customerParam =
      params.customer ??
      params.customerId ??
      params.customerName ??
      filters.customer ??
      filters.customerId ??
      filters.customerName;
    if (customerParam) {
      const resolvedKey =
        params.customer !== undefined
          ? 'customer'
          : params.customerId !== undefined
          ? 'customerId'
          : params.customerName !== undefined
          ? 'customerName'
          : filters.customer !== undefined
          ? 'customer'
          : filters.customerId !== undefined
          ? 'customerId'
          : 'customerName';
      searchParams.set(resolvedKey, String(customerParam));
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
      const hasDocs = Array.isArray(filteredDocs) && filteredDocs.length > 0;
      const clampStartIndex = (value = 0) => {
        const numericValue =
          Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
        const maxStart = Math.max(0, filteredDocs.length - pageSize);
        if (!filteredDocs.length) {
          return 0;
        }
        return Math.min(numericValue, maxStart);
      };
      const rawStart =
        direction === 'backward'
          ? Math.max(0, currentOffset - pageSize)
          : safeOffset;
      const clampedStart = clampStartIndex(rawStart);
      const startIndex = hasDocs ? clampedStart : safeOffset;
      const pageItems = hasDocs
        ? filteredDocs.slice(startIndex, startIndex + pageSize)
        : [];
      onPage &&
        onPage(pageItems, {
          totalItems: filteredDocs.length,
          startIndex,
        });
      const hasNext = hasDocs
        ? startIndex + pageItems.length < filteredDocs.length
        : false;
      const hasPrev = hasDocs ? startIndex > 0 : false;
      const nextOffset = hasDocs
        ? Math.min(filteredDocs.length, startIndex + pageItems.length)
        : safeOffset;
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

  function initPaginationShell({
    container,
    summaryEl,
    prevButton,
    nextButton,
    controller,
    summaryFormatter,
  }) {
    const summary =
      summaryEl ||
      container?.querySelector('#availablePaginationSummary') ||
      container?.querySelector('[data-pagination-summary]');
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

    const formatSummary =
      typeof summaryFormatter === 'function'
        ? summaryFormatter
        : (text) => text;

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

    let loadMoreButton = container.querySelector('[data-pagination="load-more"]');
    if (!loadMoreButton) {
      loadMoreButton = doc.createElement('button');
      loadMoreButton.type = 'button';
      loadMoreButton.setAttribute('data-pagination', 'load-more');
      loadMoreButton.className = 'pagination-shell__load-more';
      loadMoreButton.hidden = true;
      const actionsHost =
        next.closest?.('.inventory-pagination__actions') ||
        next.parentElement ||
        container;
      actionsHost.appendChild(loadMoreButton);
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
      summary.textContent = formatSummary(summaryText);
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
      const isLoadMoreMode = state.mode === 'loadMore';
      if (loadMoreButton) {
        if (isLoadMoreMode) {
          loadMoreButton.hidden = false;
          const label =
            state.loadMoreLabel ||
            'Load more';
          loadMoreButton.textContent = label;
          const disableLoadMore = state.isBusy || state.nextDisabled;
          loadMoreButton.disabled = Boolean(disableLoadMore);
          loadMoreButton.setAttribute('aria-label', label);
        } else {
          loadMoreButton.hidden = true;
        }
      }
      if (isLoadMoreMode) {
        if (pages) {
          pages.replaceChildren();
          pages.hidden = true;
        }
      } else {
        renderNumericButtons(state);
      }
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

    const handleLoadMore = () => {
      if (loadMoreButton?.disabled) return;
      if (typeof controller?.loadMore !== 'function') return;
      controller.loadMore();
      updateUi();
    };

    prev.addEventListener('click', handlePrev);
    next.addEventListener('click', handleNext);
    pages?.addEventListener('click', handlePageButtonClick);
    loadMoreButton?.addEventListener('click', handleLoadMore);
    updateUi();

    return {
      sync: updateUi,
      cleanup() {
        prev.removeEventListener('click', handlePrev);
        next.removeEventListener('click', handleNext);
        pages?.removeEventListener('click', handlePageButtonClick);
        loadMoreButton?.removeEventListener('click', handleLoadMore);
      },
    };
  }
}
