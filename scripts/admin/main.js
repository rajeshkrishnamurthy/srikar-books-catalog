// Intent: minimal glue that wires auth, lookup, auto-pricing, inventory, requests, and editor.
import { settings } from '../config.js';
import { initAuth } from './auth.js';
import { bindAutoPrice } from './autoPrice.js';
import { wireLookup } from './lookup.js';
import { initInventory } from './inventory.js';
import { initRequests } from './requests.js';
import { initEditor } from './editor.js';
import { initSupplierMaster } from './suppliers.js';
import { initCustomerMaster } from './customers.js';
import { initSaleHeader } from './salesHeader.js';
import { initSaleLineItems } from './salesLineItems.js';
import { initSaleTitleAutocomplete } from './salesTitleAutocomplete.js';
import { initSalePersist } from './salesPersist.js';
import { initCustomerLookup } from './customerLookup.js';
import { initSaleEntryLauncher } from './salesEntryLauncher.js';
import { initBundleCreator } from './bundles.js';
import { initBundleStatusPanel } from './bundleStatus.js';
import { initBundleList } from './bundleList.js';
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
  getDocs,
  getDoc,
  limit,
} from '../lib/firebase.js';
import { escapeHtml, compactText } from '../helpers/text.js';

// Elements
const authEl = document.getElementById('auth');
const adminEl = document.getElementById('admin');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('authError');
const signOutBtn = document.getElementById('signOutBtn');
const adminNav = document.getElementById('adminNav');
const manageBooksAnchor = document.getElementById('manageBooksAnchor');
const adminSubNavMap = Array.from(
  document.querySelectorAll('[data-parent-nav]')
).reduce((acc, el) => {
  const parentNav = el.dataset.parentNav;
  if (parentNav) {
    acc[parentNav] = el;
  }
  return acc;
}, {});
const adminSubNavConfig = Object.fromEntries(
  Object.entries(adminSubNavMap).map(([parentNav, subNavEl]) => {
    const tabs = Array.from(
      subNavEl?.querySelectorAll('[data-manage-tab]')
    )
      .map((btn) => btn?.dataset?.manageTab)
      .filter(Boolean);
    return [
      parentNav,
      {
        parentNav,
        elementId: subNavEl?.id || '',
        tabs,
      },
    ];
  })
);
const addBookPanel = document.getElementById('addBookPanel');
const availableBooksPanel = document.getElementById('availableBooksPanel');
const soldBooksPanel = document.getElementById('soldBooksPanel');
const bookRequestsPanel = document.getElementById('bookRequestsPanel');
const suppliersPanel = document.getElementById('suppliersPanel');
const bundlesPanel = document.getElementById('bundlesPanel');
const bundleCreatePanel = document.getElementById('bundleCreatePanel');
const bundleManagePanel = document.getElementById('bundleManagePanel');
const customerPanel = document.getElementById('customerPanel');
const customerPanelSection = customerPanel?.closest('.panel') || customerPanel;

const addForm = document.getElementById('addForm');
const addMsg = document.getElementById('addMsg');
const authorInput = document.getElementById('authorInput'); // add form's author input (with datalist)
const authorList = document.getElementById('authorList');
const lookupBtn = document.getElementById('lookupBtn');
const lookupMsg = document.getElementById('lookupMsg');
const lookupResults = document.getElementById('lookupResults');
const coverInput = document.getElementById('coverInput');
const availList = document.getElementById('availList');
const soldList = document.getElementById('soldList');
const availableSearchInput = document.getElementById('availableSearchInput');
const availableSearchStatus = document.getElementById('availableSearchStatus');
const reqOpen = document.getElementById('reqOpen');
const reqClosed = document.getElementById('reqClosed');
const searchCoverBtn = document.getElementById('searchCoverBtn');
const coverPreviewEl = document.getElementById('coverPreview');
const supplierForm = document.getElementById('supplierForm');
const supplierNameInput = document.getElementById('supplierNameInput');
const supplierLocationInput = document.getElementById('supplierLocationInput');
const supplierMsg = document.getElementById('supplierMsg');
const supplierList = document.getElementById('supplierList');
const supplierIdInput = document.getElementById('supplierIdInput');
const supplierCancelBtn = document.getElementById('supplierCancelBtn');
const supplierSelect = document.getElementById('supplierSelect');
const bundleForm = document.getElementById('bundleForm');
const bundleTitleInput = document.getElementById('bundleTitleInput');
const bundleSupplierSelect = document.getElementById('bundleSupplierSelect');
const bundleBookInput = document.getElementById('bundleBookInput');
const bundleBookHiddenInput = document.getElementById('bundleBookHiddenInput');
const bundleBookSuggestions = document.getElementById('bundleBookSuggestions');
const bundleBookSummary = document.getElementById('bundleBookSummary');
const bundleBookMsg = document.getElementById('bundleBookMsg');
const bundleSelectedBooks = document.getElementById('bundleSelectedBooks');
const bundleRecommendedHint = document.getElementById('bundleRecommendedHint');
const bundlePriceInput = document.getElementById('bundlePriceInput');
const bundlePriceMsg = document.getElementById('bundlePriceMsg');
const bundleMsg = document.getElementById('bundleMsg');
const bundleSubmitBtn = document.getElementById('bundleSubmitBtn');
const bundleResetBtn = document.getElementById('bundleResetBtn');
const bundleSearchInput = document.getElementById('bundleSearchInput');
const bundleSearchHiddenInput = document.getElementById('bundleSearchHiddenInput');
const bundleSearchSuggestions = document.getElementById('bundleSearchSuggestions');
const bundleSearchMsg = document.getElementById('bundleSearchMsg');
const bundleSearchSummary = document.getElementById('bundleSearchSummary');
const bundleFilterSupplier = document.getElementById('bundleFilterSupplier');
const bundleFilterStatus = document.getElementById('bundleFilterStatus');
const bundleResults = document.getElementById('bundleResults');
const bundleEmpty = document.getElementById('bundleEmpty');
const bundleStatusPanel = document.getElementById('bundleStatusPanel');
const bundleStatusForm = document.getElementById('bundleStatusForm');
const bundleStatusChip = document.getElementById('bundleStatusChip');
const bundleStatusToggle = document.getElementById('bundlePublishToggle');
const bundleStatusMsg = document.getElementById('bundleStatusMsg');
const bundleDetailTitle = document.getElementById('bundleDetailTitle');
const bundleDetailPrice = document.getElementById('bundleDetailPrice');
const customerForm = document.getElementById('customerForm');
const customerNameInput = document.getElementById('customerNameInput');
const customerAddressInput = document.getElementById('customerAddressInput');
const customerLocationInput = document.getElementById('customerLocationInput');
const customerWhatsAppInput = document.getElementById('customerWhatsAppInput');
const customerMsg = document.getElementById('customerMsg');
const customerList = document.getElementById('customerList');
const customerIdInput = document.getElementById('customerIdInput');
const customerCancelBtn = document.getElementById('customerCancelBtn');
const saleHeaderForm = document.getElementById('saleHeaderForm');
const saleHeaderSaleDateInput = document.getElementById('saleHeaderSaleDate');
const saleHeaderCustomerSummary = document.getElementById('saleHeaderCustomerSummary');
const saleHeaderCustomerId = document.getElementById('saleHeaderCustomerId');
const saleHeaderContinueBtn = document.getElementById('saleHeaderContinue');
const saleHeaderMsg = document.getElementById('saleHeaderMsg');
const saleHeaderDatePicker = document.getElementById('saleHeaderDatePicker');
const saleCustomerLookupSearch = document.getElementById('saleCustomerLookupSearch');
const saleCustomerLookupList = document.getElementById('saleCustomerLookupList');
const saleCustomerLookupEmpty = document.getElementById('saleCustomerLookupEmpty');
const saleLineDraftForm = document.getElementById('saleLineDraftForm');
const saleLineDraftLabel = document.getElementById('saleLineDraftLabel');
const saleLineBookTitle = document.getElementById('saleLineBookTitle');
const saleLineSuggestions = document.getElementById('saleLineSuggestions');
const saleLineSupplierSelect = document.getElementById('saleLineSupplierSelect');
const saleLineBookIdInput = document.getElementById('saleLineBookId');
const saleLineSummary = document.getElementById('saleLineBookSummary');
const saleLinePriceInput = document.getElementById('saleLinePrice');
const saleLineAddBtn = document.getElementById('saleLineAddBtn');
const saleTitleMsg = document.getElementById('saleTitleMsg');
const saleLineMsg = document.getElementById('saleLineMsg');
const saleLineItemsBody = document.getElementById('saleLineItemsBody');
const saleLineTotalsCount = document.getElementById('saleLineTotalsCount');
const saleLineTotalsAmount = document.getElementById('saleLineTotalsAmount');
const salePersistBtn = document.getElementById('salePersistBtn');
const salePersistMsg = document.getElementById('salePersistMsg');
const saleLineStatusList = document.getElementById('saleLineStatusList');
const saleLineRemovalStatus = document.getElementById('saleLineRemovalStatus');
const saleLineBookTitleMsg = saleTitleMsg;
const recordSaleBtn = document.getElementById('recordSaleBtn');
const saleEntryPanel = document.getElementById('saleEntryPanel');
const bookRequestsOpenPanel = document.getElementById('bookRequestsOpenPanel');
const bookRequestsClosedPanel = document.getElementById('bookRequestsClosedPanel');
const supplierCreatePanel = document.getElementById('supplierCreatePanel');
const supplierManagePanel = document.getElementById('supplierManagePanel');
const customerCreatePanel = document.getElementById('customerCreatePanel');
const customerManagePanel = document.getElementById('customerManagePanel');
const MANAGE_PANEL_GROUP = [addBookPanel, availableBooksPanel, soldBooksPanel];
const MANAGE_SUB_TABS = {
  add: addBookPanel,
  available: availableBooksPanel,
  sold: soldBooksPanel,
};
const BUNDLES_SUB_TABS = {
  create: bundleCreatePanel,
  manage: bundleManagePanel,
};
const SALE_SUB_TABS = {
  record: saleEntryPanel,
};
const BOOK_REQUESTS_SUB_TABS = {
  open: bookRequestsOpenPanel,
  closed: bookRequestsClosedPanel,
};
const SUPPLIERS_SUB_TABS = {
  create: supplierCreatePanel,
  manage: supplierManagePanel,
};
const CUSTOMERS_SUB_TABS = {
  create: customerCreatePanel,
  manage: customerManagePanel,
};
const SUB_NAV_TABS = {
  manageBooks: MANAGE_SUB_TABS,
  bundles: BUNDLES_SUB_TABS,
  recordSale: SALE_SUB_TABS,
  bookRequests: BOOK_REQUESTS_SUB_TABS,
  suppliers: SUPPLIERS_SUB_TABS,
  customers: CUSTOMERS_SUB_TABS,
};
const SUB_NAV_DEFAULTS = {
  manageBooks: 'add',
  bundles: 'create',
  recordSale: 'record',
  bookRequests: 'open',
  suppliers: 'create',
  customers: 'create',
};
const subNavState = Object.keys(SUB_NAV_DEFAULTS).reduce((acc, navKey) => {
  acc[navKey] = { current: SUB_NAV_DEFAULTS[navKey], pending: '' };
  return acc;
}, {});
const NAV_PANEL_GROUPS = {
  manageBooks: MANAGE_PANEL_GROUP,
  bundles: [bundlesPanel],
  recordSale: [saleEntryPanel],
  bookRequests: [bookRequestsPanel],
  suppliers: [suppliersPanel],
  customers: [customerPanelSection],
};
let suppressHashChange = false;
let inventoryApi = null;
let editorApi = null;
let supplierMasterApi = null;
let customerMasterApi = null;
let saleHeaderApi = null;
let saleCustomerLookupApi = null;
let saleLineItemsApi = null;
let saleTitleAutocompleteApi = null;
let salePersistApi = null;
let latestSupplierOptions = [];
let unsubscribeSuppliers = null;
let disposeSaleEntry = null;
let latestSaleHeaderPayload = null;
let saleEntryLauncherApi = null;
let saleEntryInitialized = false;
let bundleCreatorApi = null;
let bundleListApi = null;
let unsubscribeBundleList = null;
let latestBundleDocs = [];
let bundleSnapshotVersion = 0;
const bundleBookCache = new Map();
let bundleStatusPanelApi = null;
let currentAdminUser = null;
const supplierBooksCache = new Map();
const SUPPLIER_BOOK_CACHE_TTL_MS = 2 * 60 * 1000;
const DEFAULT_LANDING_HASH = '#add-book';
let landingHashIncludesSubRoute = false;
const ADMIN_NAV_CONFIG = [
  { id: 'manageBooks', panelId: 'addBookPanel' },
  { id: 'bundles', panelId: 'bundlesPanel' },
  { id: 'recordSale', panelId: 'saleEntryPanel' },
  { id: 'bookRequests', panelId: 'bookRequestsPanel' },
  { id: 'suppliers', panelId: 'suppliersPanel' },
  { id: 'customers', panelId: 'customerPanel' },
];
const ADMIN_NAV_LOOKUP = ADMIN_NAV_CONFIG.reduce((acc, entry) => {
  acc[entry.id] = entry;
  return acc;
}, {});

try {
  globalThis.__adminNavMap = ADMIN_NAV_CONFIG.map(({ id, panelId }) => ({
    id,
    panelId,
  }));
  globalThis.__adminSubNavMap = adminSubNavConfig;
} catch {}

hydrateAdminNavControls();

adminNav?.addEventListener('click', (event) => {
  const button = event.target?.closest('button[data-nav]');
  if (!button) return;
  const navKey = button.dataset.nav;
  if (!navKey) return;
  handleAdminNav(navKey, button);
});

Object.entries(adminSubNavMap).forEach(([parentNav, subNavEl]) => {
  subNavEl?.addEventListener('click', (event) => {
    const tabButton = event.target?.closest('button[data-manage-tab]');
    if (!tabButton) return;
    const tabKey = tabButton.dataset.manageTab;
    if (!tabKey) return;
    handleSubNav(parentNav, tabKey, tabButton);
  });
});

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', handleHashChange);
}

saleHeaderDatePicker?.addEventListener('input', () => {
  if (!saleHeaderSaleDateInput) return;
  const isoValue = saleHeaderDatePicker.value;
  if (!isoValue) return;
  const formatted = formatIsoToDdMonYy(isoValue);
  if (!formatted) return;
  saleHeaderSaleDateInput.value = formatted;
  saleHeaderSaleDateInput.dispatchEvent(new Event('input', { bubbles: true }));
});

saleHeaderSaleDateInput?.addEventListener('blur', syncPickerFromText);
saleHeaderSaleDateInput?.addEventListener('change', syncPickerFromText);
syncPickerFromText();

saleHeaderForm?.addEventListener('reset', () => {
  if (saleHeaderDatePicker) {
    saleHeaderDatePicker.value = '';
  }
});

// --- Authors datalist subscription (single definition) ---
function subscribeAuthors() {
  const qAuthors = query(collection(db, 'authors'), orderBy('name'));
  onSnapshot(
    qAuthors,
    (snap) => {
      const seen = new Set();
      const opts = [];
      for (const d of snap.docs) {
        const name = String(d.data().name || '');
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        opts.push(`<option value="${escapeHtml(name)}"></option>`);
      }
      authorList.innerHTML = opts.join('');
    },
    (err) => console.error('authors onSnapshot error:', err)
  );
}

function applySuppliersToConsumers() {
  inventoryApi?.setSuppliers(latestSupplierOptions);
  editorApi?.setSuppliers?.(latestSupplierOptions);
  saleLineItemsApi?.setSuppliers?.(latestSupplierOptions);
  bundleCreatorApi?.setSuppliers?.(latestSupplierOptions);
  bundleListApi?.setSuppliers?.(latestSupplierOptions);
}

function subscribeSuppliersForAdd() {
  unsubscribeSuppliers?.();
  const qSuppliers = query(collection(db, 'suppliers'), orderBy('name'));
  unsubscribeSuppliers = onSnapshot(
    qSuppliers,
    (snap) => {
      latestSupplierOptions = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() || {}),
      }));
      supplierBooksCache.clear();
      applySuppliersToConsumers();
    },
    (err) => console.error('suppliers select snapshot error:', err)
  );
}

function ensureBundleListReady() {
  if (
    !bundleSearchInput ||
    !bundleSearchHiddenInput ||
    !bundleSearchSuggestions ||
    !bundleFilterSupplier ||
    !bundleFilterStatus ||
    !bundleResults ||
    !bundleEmpty
  ) {
    return;
  }
  if (bundleListApi) {
    return;
  }
  bundleListApi = initBundleList(
    {
      searchInput: bundleSearchInput,
      searchHiddenInput: bundleSearchHiddenInput,
      suggestionsEl: bundleSearchSuggestions,
      summaryEl: bundleSearchSummary,
      searchMsg: bundleSearchMsg,
      supplierSelect: bundleFilterSupplier,
      statusSelect: bundleFilterStatus,
      resultsEl: bundleResults,
      emptyEl: bundleEmpty,
    },
    {
      loadBundles: () => Promise.resolve(latestBundleDocs),
      loadSuppliers: () => Promise.resolve(latestSupplierOptions),
      renderPublishControls: (bundle) => renderBundlePublishControls(bundle),
      createBookLookup: (config = {}) => createBundleListLookup(config),
      hydrateBundleBooks: (bundle) => hydrateBundleBooksForListing(bundle),
    }
  );
}

function subscribeBundlesForList() {
  if (typeof onSnapshot !== 'function' || typeof collection !== 'function') {
    return;
  }
  unsubscribeBundleList?.();
  try {
    const bundlesRef = collection(db, 'bundles');
    const constraints =
      typeof orderBy === 'function' ? [orderBy('title')] : [];
    const queryRef =
      constraints.length && typeof query === 'function'
        ? query(bundlesRef, ...constraints)
        : bundlesRef;
    unsubscribeBundleList = onSnapshot(
      queryRef,
      async (snapshot) => {
        const version = ++bundleSnapshotVersion;
        const raw = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() || {}),
        }));
        const enriched = await enrichBundlesWithBooks(raw);
        if (version !== bundleSnapshotVersion) {
          return;
        }
        latestBundleDocs = enriched;
        bundleListApi?.setBundles?.(latestBundleDocs);
      },
      (error) => {
        console.error('bundle list snapshot error:', error);
        bundleListApi?.setError?.(error);
      }
    );
  } catch (error) {
    console.error('Failed to subscribe bundle list', error);
  }
}

async function enrichBundlesWithBooks(bundles = []) {
  if (!Array.isArray(bundles) || !bundles.length) {
    return bundles;
  }
  const preNormalized = new Map();
  const missingIds = new Set();
  bundles.forEach((bundle) => {
    const normalizedBooks = extractBooksFromDoc(bundle);
    if (normalizedBooks.length) {
      normalizedBooks.forEach((book) => {
        bundleBookCache.set(book.id, book);
      });
      preNormalized.set(bundle.id, normalizedBooks);
      return;
    }
    (bundle.bookIds || []).forEach((bookId) => {
      const key = String(bookId || '').trim();
      if (key && !bundleBookCache.has(key)) {
        missingIds.add(key);
      }
    });
  });
  if (missingIds.size) {
    await fetchBooksIntoCache([...missingIds]);
  }
  return bundles.map((bundle) => {
    const preset = preNormalized.get(bundle.id);
    return {
      ...bundle,
      books: preset || resolveBundleBooks(bundle),
    };
  });
}

function extractBooksFromDoc(bundle = {}) {
  const rawBooks = Array.isArray(bundle.books) ? bundle.books : [];
  return rawBooks
    .map((book) => normalizeBundleBook(book))
    .filter(Boolean);
}

function resolveBundleBooks(bundle = {}) {
  const ids = Array.isArray(bundle.bookIds) ? bundle.bookIds : [];
  return ids
    .map((bookId) => {
      const key = String(bookId || '').trim();
      if (!key) return null;
      const cached = bundleBookCache.get(key);
      return cached || null;
    })
    .filter(Boolean);
}

async function fetchBooksIntoCache(ids = []) {
  if (
    !ids.length ||
    typeof getDoc !== 'function' ||
    typeof doc !== 'function'
  ) {
    return;
  }
  await Promise.all(
    ids.map(async (bookId) => {
      try {
        const docRef = doc(db, 'books', bookId);
        const snap = await getDoc(docRef);
        if (!snap?.exists?.()) return;
        const data = snap.data() || {};
        const normalized = normalizeBundleBook({ id: bookId, ...data });
        if (normalized) {
          bundleBookCache.set(bookId, normalized);
        }
      } catch (error) {
        console.error('bundle list book fetch failed', error);
      }
    })
  );
}

function normalizeBundleBook(raw = {}) {
  const id = String(raw.id || '').trim();
  if (!id) return null;
  const priceSource =
    raw.price ??
    raw.Price ??
    raw.sellingPrice ??
    raw.listPrice ??
    raw.history?.lastSellingPrice ??
    0;
  const numericPrice = Number(priceSource);
  return {
    id,
    title: compactText(raw.title || ''),
    author: compactText(raw.author || ''),
    isbn: compactText(raw.isbn || ''),
    price: Number.isFinite(numericPrice) ? numericPrice : 0,
    supplierId: raw.supplierId || raw.supplier?.id || '',
  };
}

function hydrateBundleBooksForListing(bundle = {}) {
  if (!bundle || !Array.isArray(bundle.bookIds) || !bundle.bookIds.length) {
    return Promise.resolve(Array.isArray(bundle.books) ? bundle.books : []);
  }
  const ids = bundle.bookIds
    .map((bookId) => String(bookId || '').trim())
    .filter(Boolean);
  if (!ids.length) {
    return Promise.resolve([]);
  }
  return fetchBooksIntoCache(ids)
    .then(() =>
      ids
        .map((id) => bundleBookCache.get(id))
        .filter(Boolean)
    )
    .catch((error) => {
      console.error('hydrate bundle books failed', error);
      return [];
    });
}

function renderBundlePublishControls(bundle = {}) {
  const container = document.createElement('div');
  container.className = 'bundle-publish-controls';
  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'bundle-toggle bundle-toggle--inline';
  const control = document.createElement('span');
  control.className = 'bundle-toggle__control';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  input.setAttribute('aria-label', 'Publish bundle');
  const isPublished = (bundle.status || 'Draft') === 'Published';
  input.checked = isPublished;
  input.setAttribute('aria-checked', String(isPublished));
  const track = document.createElement('span');
  track.className = 'bundle-toggle__track';
  const thumb = document.createElement('span');
  thumb.className = 'bundle-toggle__thumb';
  track.appendChild(thumb);
  control.appendChild(input);
  control.appendChild(track);
  const stateSpan = document.createElement('span');
  stateSpan.className = 'bundle-toggle__state';
  stateSpan.dataset.draft = 'Draft';
  stateSpan.dataset.published = 'Published';
  stateSpan.textContent = isPublished
    ? stateSpan.dataset.published
    : stateSpan.dataset.draft;
  toggleLabel.append(control, stateSpan);
  container.appendChild(toggleLabel);

  const setBusy = (busy, pendingStatus) => {
    input.disabled = busy;
    if (busy) {
      toggleLabel.dataset.busy = pendingStatus || '';
    } else {
      toggleLabel.dataset.busy = '';
    }
  };

  input.addEventListener('change', async () => {
    const nextStatus = input.checked ? 'Published' : 'Draft';
    setBusy(true, nextStatus);
    try {
      await updateBundleStatus(bundle.id, nextStatus);
      stateSpan.textContent =
        nextStatus === 'Published'
          ? stateSpan.dataset.published
          : stateSpan.dataset.draft;
      input.setAttribute('aria-checked', String(input.checked));
    } catch (error) {
      console.error('row publish toggle failed', error);
      input.checked = !input.checked;
      input.setAttribute('aria-checked', String(input.checked));
      stateSpan.textContent = input.checked
        ? stateSpan.dataset.published
        : stateSpan.dataset.draft;
    } finally {
      setBusy(false);
    }
  });

  return container;
}

function showBundleStatusPanel(bundle = {}) {
  if (
    !bundle?.id ||
    !bundleStatusPanel ||
    !bundleStatusForm ||
    !bundleStatusToggle ||
    !bundleStatusChip
  ) {
    return;
  }
  ensurePanelVisible(bundleStatusPanel);
  const status = bundle.status || 'Draft';
  if (bundleDetailTitle) {
    const title = bundle.title || '';
    bundleDetailTitle.value = title;
    bundleDetailTitle.dataset.originalValue = title;
  }
  if (bundleDetailPrice) {
    const priceValue =
      bundle.bundlePriceRupees != null ? String(bundle.bundlePriceRupees) : '';
    bundleDetailPrice.value = priceValue;
    bundleDetailPrice.dataset.originalValue = priceValue;
  }
  bundleStatusForm.dataset.bundleStatus = status;
  bundleStatusChip.dataset.status = status;
  bundleStatusChip.textContent = `Status: ${status}`;
  bundleStatusToggle.checked = status === 'Published';
  bundleStatusToggle.setAttribute(
    'aria-checked',
    String(bundleStatusToggle.checked)
  );
  bundleStatusMsg && (bundleStatusMsg.textContent = '');
  bundleStatusPanelApi?.dispose?.();
  bundleStatusPanelApi = initBundleStatusPanel(
    {
      form: bundleStatusForm,
      statusToggle: bundleStatusToggle,
      statusChip: bundleStatusChip,
      msgEl: bundleStatusMsg,
      immutableFields: [bundleDetailTitle, bundleDetailPrice],
    },
    {
      firebase: { db, doc, updateDoc },
      bundleId: bundle.id,
    }
  );
  scrollPanelIntoView(bundleStatusPanel);
}

async function updateBundleStatus(bundleId, nextStatus) {
  if (!bundleId || !nextStatus) return;
  if (typeof doc !== 'function' || typeof updateDoc !== 'function') {
    console.warn('Firebase doc/updateDoc unavailable for bundle status.');
    return;
  }
  try {
    const bundleRef = doc(db, 'bundles', bundleId);
    await updateDoc(bundleRef, { status: nextStatus });
  } catch (error) {
    console.error('Failed to update bundle status', error);
  }
}

function handleAdminNav(navKey, button) {
  if (!navKey || !button) return;
  setActiveNav(button);
  toggleSubNavs(navKey);
  showOnlyNavPanelGroup(navKey);
  if (SUB_NAV_TABS[navKey] && subNavState[navKey]) {
    const pendingTab = subNavState[navKey]?.pending;
    if (!pendingTab) {
      subNavState[navKey].current = SUB_NAV_DEFAULTS[navKey];
    }
    handleSubNav(navKey, pendingTab || SUB_NAV_DEFAULTS[navKey], null);
  }
  switch (navKey) {
    case 'manageBooks':
      break;
    case 'recordSale':
      revealSaleEntryPanel();
      break;
    case 'bookRequests':
      ensurePanelVisible(bookRequestsPanel);
      break;
    case 'suppliers':
      ensurePanelVisible(suppliersPanel);
      break;
    case 'customers':
      ensurePanelVisible(customerPanelSection);
      break;
    case 'bundles':
      ensurePanelVisible(bundlesPanel);
      break;
    default:
      break;
  }
  if (navKey === 'customers') {
    focusCustomerPanelHeading();
  }
  updateNavHash(navKey);
}

function setActiveNav(activeButton) {
  if (!adminNav) return;
  adminNav.querySelectorAll('.admin-nav__item').forEach((btn) => {
    const isActive = btn === activeButton;
    btn.classList.toggle('is-active', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
    btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });
  if (activeButton?.dataset.nav === 'customers') {
    focusCustomerPanelHeading();
  }
}

function ensurePanelVisible(panel) {
  if (!panel) return;
  panel.removeAttribute?.('hidden');
  if (panel.tagName === 'DETAILS') {
    panel.open = true;
  }
}

function ensurePanelHidden(panel) {
  if (!panel) return;
  panel.hidden = true;
  if (panel.tagName === 'DETAILS') {
    panel.open = false;
  }
}

function showOnlyNavPanelGroup(navKey) {
  if (!navKey || !NAV_PANEL_GROUPS[navKey]) return;
  Object.entries(NAV_PANEL_GROUPS).forEach(([groupKey, panels]) => {
    const shouldShow = groupKey === navKey;
    panels.forEach((panel) => {
      if (!panel) return;
      if (shouldShow) {
        ensurePanelVisible(panel);
      } else {
        ensurePanelHidden(panel);
      }
    });
  });
}

function handleSubNav(navKey, tabKey, tabButton) {
  if (!navKey || !SUB_NAV_TABS[navKey]) return;
  const tabMap = SUB_NAV_TABS[navKey];
  const state = subNavState[navKey];
  if (!tabMap || !state) return;
  let targetKey = '';
  if (tabKey && tabMap[tabKey]) {
    targetKey = tabKey;
  } else if (state.pending && tabMap[state.pending]) {
    targetKey = state.pending;
  } else if (state.current && tabMap[state.current]) {
    targetKey = state.current;
  } else {
    targetKey = SUB_NAV_DEFAULTS[navKey];
  }
  if (!targetKey || !tabMap[targetKey]) return;
  state.pending = '';
  state.current = targetKey;
  const subNavEl = adminSubNavMap[navKey];
  const activeButton =
    tabButton || subNavEl?.querySelector(`[data-manage-tab="${targetKey}"]`);
  subNavEl?.querySelectorAll('button[data-manage-tab]').forEach((btn) => {
    const isActive = btn === activeButton;
    btn.classList.toggle('is-active', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
  Object.entries(tabMap).forEach(([key, panel]) => {
    if (!panel) return;
    if (key === targetKey) {
      ensurePanelVisible(panel);
      if (panel.tagName === 'DETAILS') {
        panel.open = true;
      }
    } else {
      ensurePanelHidden(panel);
    }
  });
  updateSubNavHash(navKey, targetKey);
}

function setPendingSubNav(navKey, tabKey) {
  if (!navKey || !tabKey) return;
  const tabMap = SUB_NAV_TABS[navKey];
  const state = subNavState[navKey];
  if (!tabMap || !state || !tabMap[tabKey]) return;
  state.pending = tabKey;
}

function updateSubNavHash(navKey, tabKey) {
  switch (navKey) {
    case 'manageBooks':
      updateManageSubHash(tabKey);
      return;
    case 'bundles':
      updateBundlesSubHash(tabKey);
      return;
    case 'recordSale':
      updateSaleSubHash(tabKey);
      return;
    case 'bookRequests':
      updateBookRequestsSubHash(tabKey);
      return;
    case 'suppliers':
      updateSuppliersSubHash(tabKey);
      return;
    case 'customers':
      updateCustomersSubHash(tabKey);
      return;
    default:
      break;
  }
}

function toggleSubNavs(activeNav) {
  Object.entries(adminSubNavMap).forEach(([parentNav, subNavEl]) => {
    const isVisible = parentNav === activeNav;
    if (isVisible) {
      subNavEl.hidden = false;
      subNavEl.classList.add('is-visible');
    } else {
      subNavEl.hidden = true;
      subNavEl.classList.remove('is-visible');
    }
  });
}

function focusCustomerPanelHeading() {
  const summary =
    customerPanelSection?.querySelector?.('summary, [data-customer-panel-heading]');
  summary?.focus?.();
}

function getNavButton(navKey) {
  if (!navKey || !adminNav) return null;
  return adminNav.querySelector(`.admin-nav__item[data-nav="${navKey}"]`);
}

function hydrateAdminNavControls() {
  if (!adminNav) return;
  ADMIN_NAV_CONFIG.forEach(({ id, panelId }) => {
    const button = getNavButton(id);
    if (!button) return;
    if (panelId) {
      button.setAttribute('aria-controls', panelId);
    }
  });
}

function scrollPanelIntoView(target) {
  target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

function revealSaleEntryPanel() {
  ensurePanelVisible(saleEntryPanel);
  ensureSaleEntryInitialized();
  const scrollX = window?.scrollX ?? 0;
  const scrollY = window?.scrollY ?? 0;
  const focusField = () => saleHeaderSaleDateInput?.focus?.();
  if (saleHeaderSaleDateInput?.focus) {
    try {
      saleHeaderSaleDateInput.focus({ preventScroll: true });
    } catch {
      focusField();
      window?.scrollTo?.(scrollX, scrollY);
      return;
    }
    window?.scrollTo?.(scrollX, scrollY);
  }
}

const MONTH_MAP = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatIsoToDdMonYy(isoValue = '') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoValue);
  if (!match) return '';
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const monthLabel = MONTH_MAP[monthIndex];
  if (!monthLabel) return '';
  const shortYear = year.slice(-2);
  return `${day}-${monthLabel}-${shortYear}`;
}

function parseDdMonYyToIso(value = '') {
  const match = /^(\d{2})-([a-z]{3})-(\d{2})$/i.exec(value.trim());
  if (!match) return '';
  const [, dd, mon, yy] = match;
  const monthIndex = MONTH_MAP.findIndex(
    (label) => label.toLowerCase() === mon.toLowerCase()
  );
  if (monthIndex === -1) return '';
  const fullYear = Number(yy);
  const normalizedYear = fullYear >= 70 ? 1900 + fullYear : 2000 + fullYear;
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${normalizedYear}-${month}-${dd}`;
}

function syncPickerFromText() {
  if (!saleHeaderDatePicker || !saleHeaderSaleDateInput) return;
  const iso = parseDdMonYyToIso(saleHeaderSaleDateInput.value);
  saleHeaderDatePicker.value = iso || '';
}

function ensureDefaultLanding() {
  const navTarget = resolveLandingNavTarget();
  if (navTarget) {
    clearSectionQuery();
    if (navTarget === 'manageBooks') {
      const manageButton = getNavButton('manageBooks');
      if (manageButton) {
        handleAdminNav('manageBooks', manageButton);
      }
      landingHashIncludesSubRoute = false;
      return;
    }
    if (!landingHashIncludesSubRoute) {
      setHashSafely(`#${navTarget}`);
    }
  }
  if (navTarget && navTarget !== 'manageBooks') {
    const targetButton = adminNav?.querySelector(`[data-nav="${navTarget}"]`);
    if (targetButton) {
      handleAdminNav(navTarget, targetButton);
      landingHashIncludesSubRoute = false;
      return;
    }
  }

  if (!navTarget) {
    ensureDefaultHash();
  }

  const manageButton = getNavButton('manageBooks');
  if (manageButton) {
    handleAdminNav('manageBooks', manageButton);
  } else {
    showOnlyNavPanelGroup('manageBooks');
    ensurePanelVisible(addBookPanel);
    ensurePanelVisible(availableBooksPanel);
    ensurePanelVisible(soldBooksPanel);
  }
  landingHashIncludesSubRoute = false;
}

function ensureDefaultHash() {
  const currentHash = window?.location?.hash || '';
  if (!currentHash || currentHash === '#') {
    setHashSafely(DEFAULT_LANDING_HASH);
  }
}

function resolveLandingNavTarget() {
  const hashValue =
    typeof window !== 'undefined' ? window.location?.hash || '' : '';
  const hashTarget = normalizeLandingHint(hashValue);
  if (hashTarget) {
    if (hashTarget === 'manageBooks') {
      const subTab = normalizeManageSubHint(hashValue);
      if (subTab) {
        setPendingSubNav('manageBooks', subTab);
        landingHashIncludesSubRoute = true;
      }
    } else if (hashTarget === 'bundles') {
      const bundleTab = normalizeBundlesSubHint(hashValue);
      if (bundleTab) {
        setPendingSubNav('bundles', bundleTab);
        landingHashIncludesSubRoute = true;
      }
    } else if (hashTarget === 'recordSale') {
      const saleTab = normalizeSaleSubHint(hashValue);
      if (saleTab) {
        setPendingSubNav('recordSale', saleTab);
        landingHashIncludesSubRoute = true;
      }
    } else if (hashTarget === 'bookRequests') {
      const reqTab = normalizeBookRequestsSubHint(hashValue);
      if (reqTab) {
        setPendingSubNav('bookRequests', reqTab);
        landingHashIncludesSubRoute = true;
      }
    } else if (hashTarget === 'suppliers') {
      const supplierTab = normalizeSuppliersSubHint(hashValue);
      if (supplierTab) {
        setPendingSubNav('suppliers', supplierTab);
        landingHashIncludesSubRoute = true;
      }
    } else if (hashTarget === 'customers') {
      const customerTab = normalizeCustomersSubHint(hashValue);
      if (customerTab) {
        setPendingSubNav('customers', customerTab);
        landingHashIncludesSubRoute = true;
      }
    }
    return hashTarget;
  }
  const searchValue =
    typeof window !== 'undefined' ? window.location?.search || '' : '';
  const searchParams = new URLSearchParams(searchValue);
  const sectionTarget = normalizeLandingHint(searchParams.get('section') || '');
  return sectionTarget || '';
}

function normalizeLandingHint(raw = '') {
  const trimmed = String(raw).trim();
  if (/^#?manage-books\//i.test(trimmed)) {
    return 'manageBooks';
  }
  if (/^#?bundles\//i.test(trimmed)) {
    return 'bundles';
  }
  if (/^#?(sale|recordsale)\//i.test(trimmed)) {
    return 'recordSale';
  }
  if (/^#?(book-requests|bookrequests)\//i.test(trimmed)) {
    return 'bookRequests';
  }
  if (/^#?suppliers\//i.test(trimmed)) {
    return 'suppliers';
  }
  if (/^#?customers\//i.test(trimmed)) {
    return 'customers';
  }
  const cleaned = String(raw)
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!cleaned) {
    return '';
  }
  switch (cleaned) {
    case 'managebooks':
    case 'manage-books':
    case 'addbook':
    case 'addbooks':
    case 'add':
      return 'manageBooks';
    case 'bookrequests':
    case 'bookrequestspanel':
      return 'bookRequests';
    case 'suppliers':
    case 'supplierspanel':
      return 'suppliers';
    case 'customers':
    case 'customermaster':
    case 'customer':
      return 'customers';
    case 'bundles':
    case 'bundle':
      return 'bundles';
    case 'recordsale':
    case 'recordsales':
    case 'sale':
    case 'sales':
    case 'saleentry':
      return 'recordSale';
    default:
      return '';
  }
}

function normalizeManageSubHint(raw = '') {
  const match = /^#?manage-books\/([a-z]+)/i.exec(raw || '');
  if (!match) return '';
  const [, subKey] = match;
  if (['add', 'available', 'sold'].includes(subKey.toLowerCase())) {
    return subKey.toLowerCase();
  }
  return '';
}

function normalizeBundlesSubHint(raw = '') {
  const match = /^#?bundles\/([a-z]+)/i.exec(raw || '');
  if (!match) return '';
  const [, subKey] = match;
  if (['create', 'manage'].includes(subKey.toLowerCase())) {
    return subKey.toLowerCase();
  }
  return '';
}

function normalizeSaleSubHint(raw = '') {
  const match = /^#?(sale|recordsale)\/([a-z]+)/i.exec(raw || '');
  if (!match) return '';
  const [, , subKey] = match;
  if (['record'].includes(subKey.toLowerCase())) {
    return subKey.toLowerCase();
  }
  return '';
}

function normalizeBookRequestsSubHint(raw = '') {
  const match = /^#?(book-requests|bookrequests)\/([a-z]+)/i.exec(raw || '');
  if (!match) return '';
  const [, , subKey] = match;
  if (['open', 'closed'].includes(subKey.toLowerCase())) {
    return subKey.toLowerCase();
  }
  return '';
}

function normalizeSuppliersSubHint(raw = '') {
  const match = /^#?suppliers\/([a-z]+)/i.exec(raw || '');
  if (!match) return '';
  const [, subKey] = match;
  if (['create', 'manage'].includes(subKey.toLowerCase())) {
    return subKey.toLowerCase();
  }
  return '';
}

function normalizeCustomersSubHint(raw = '') {
  const match = /^#?customers\/([a-z]+)/i.exec(raw || '');
  if (!match) return '';
  const [, subKey] = match;
  if (['create', 'manage'].includes(subKey.toLowerCase())) {
    return subKey.toLowerCase();
  }
  return '';
}

function setHashSafely(value) {
  if (!value || typeof window === 'undefined') return;
  if (window.location.hash === value) return;
  try {
    suppressHashChange = true;
    window.location.hash = value;
  } catch (error) {
    console.warn('Failed to set window.location.hash', error);
    suppressHashChange = false;
    return;
  }
  setTimeout(() => {
    suppressHashChange = false;
  }, 0);
}

function updateNavHash(navKey) {
  if (!navKey) return;
  if (SUB_NAV_TABS[navKey]) {
    return;
  }
  setHashSafely(`#${navKey}`);
}

function updateManageSubHash(tabKey) {
  if (!tabKey) {
    setHashSafely(DEFAULT_LANDING_HASH);
    return;
  }
  if (tabKey === 'add') {
    setHashSafely(DEFAULT_LANDING_HASH);
    return;
  }
  setHashSafely(`#manage-books/${tabKey}`);
}

function updateBundlesSubHash(tabKey) {
  if (!tabKey || tabKey === 'create') {
    setHashSafely('#bundles/create');
    return;
  }
  if (tabKey === 'manage') {
    setHashSafely('#bundles/manage');
    return;
  }
  setHashSafely('#bundles/create');
}

function updateSaleSubHash(tabKey) {
  if (!tabKey || tabKey === 'record') {
    setHashSafely('#sale/record');
    return;
  }
  setHashSafely('#sale/record');
}

function updateBookRequestsSubHash(tabKey) {
  const target = tabKey === 'closed' ? 'closed' : 'open';
  setHashSafely(`#book-requests/${target}`);
}

function updateSuppliersSubHash(tabKey) {
  const target = tabKey === 'manage' ? 'manage' : 'create';
  setHashSafely(`#suppliers/${target}`);
}

function updateCustomersSubHash(tabKey) {
  const target = tabKey === 'manage' ? 'manage' : 'create';
  setHashSafely(`#customers/${target}`);
}

function clearSectionQuery() {
  if (typeof window === 'undefined') return;
  const currentSearch = window.location?.search || '';
  if (!currentSearch) return;
  const params = new URLSearchParams(currentSearch);
  if (!params.has('section')) return;
  params.delete('section');
  const searchString = params.toString();
  const newUrl = `${window.location.pathname}${searchString ? `?${searchString}` : ''}${window.location.hash}`;
  if (typeof window.history?.replaceState === 'function') {
    window.history.replaceState(null, document.title, newUrl);
  } else {
    window.location.search = searchString;
  }
}

function handleHashChange() {
  if (suppressHashChange) return;
  const navTarget = resolveLandingNavTarget();
  if (!navTarget) return;
  const button = getNavButton(navTarget);
  if (!button) return;
  handleAdminNav(navTarget, button);
  landingHashIncludesSubRoute = false;
}

initAuth({
  authEl,
  adminEl,
  loginForm,
  emailInput,
  passwordInput,
  authError,
  signOutBtn,
  onAuthed(user) {
    currentAdminUser = user || null;
    ensureDefaultLanding();
    // 1) Start the realtime <datalist> fill for Author autocomplete
    subscribeAuthors();

    // 2) Wire cover preview for Add form
    function updateCoverPreview() {
      if (!coverPreviewEl) return;
      coverPreviewEl.textContent = '';
      const file = coverInput?.files?.[0];
      if (!file) {
        coverPreviewEl.textContent = 'No cover selected.';
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.alt = 'Cover preview';
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      img.style.width = '96px';
      img.style.height = '144px';
      img.style.objectFit = 'contain';
      img.style.background = '#1f2329';
      img.style.border = '1px solid var(--border)';
      img.style.borderRadius = '8px';
      coverPreviewEl.appendChild(img);
    }
    coverInput?.addEventListener('change', updateCoverPreview);
    addForm?.addEventListener('reset', () => setTimeout(updateCoverPreview, 0));

    // 3) Lookup + autoPrice on Add form
    const autoPrice = bindAutoPrice(addForm);
    wireLookup({
      addForm,
      authorInput,
      coverInput,
      btn: lookupBtn,
      msgEl: lookupMsg,
      resultsEl: lookupResults,
      autoPrice,
      apiKey: settings.googleBooksApiKey || '',
    });

    // 4) Editor + Inventory (PASS addForm/addMsg/etc so submit is wired)
    const editor = initEditor();
    editorApi = editor;
    inventoryApi = initInventory({
      addForm,
      addMsg,
      authorInput,
      authorList,
      availList,
      soldList,
      availableSearchInput,
      searchStatus: availableSearchStatus,
      supplierSelect,
      onEdit: editor.open,
    });
    applySuppliersToConsumers();
    subscribeSuppliersForAdd();

    // 5) Requests panel
    initRequests({ reqOpen, reqClosed });

    supplierMasterApi?.dispose?.();
    supplierMasterApi = initSupplierMaster(
      {
        form: supplierForm,
        nameInput: supplierNameInput,
        locationInput: supplierLocationInput,
        msgEl: supplierMsg,
        listEl: supplierList,
        idInput: supplierIdInput,
        cancelBtn: supplierCancelBtn,
      },
      {
        db,
        collection,
        doc,
        addDoc,
        updateDoc,
        deleteDoc,
        query,
        orderBy,
        onSnapshot,
        serverTimestamp,
        where,
        getDocs,
        limit,
      }
    );

    customerMasterApi?.dispose?.();
    customerMasterApi = initCustomerMaster(
      {
        form: customerForm,
        nameInput: customerNameInput,
        addressInput: customerAddressInput,
        locationInput: customerLocationInput,
        whatsAppInput: customerWhatsAppInput,
        msgEl: customerMsg,
        listEl: customerList,
        idInput: customerIdInput,
        cancelBtn: customerCancelBtn,
      },
      {
        db,
        collection,
        addDoc,
        updateDoc,
        doc,
        onSnapshot,
        query,
        orderBy,
        where,
        getDocs,
        limit,
        serverTimestamp,
      }
    );

    if (recordSaleBtn && saleEntryPanel && saleHeaderSaleDateInput) {
      saleEntryLauncherApi?.dispose?.();
      saleEntryLauncherApi = initSaleEntryLauncher(
        {
          button: recordSaleBtn,
          panel: saleEntryPanel,
          focusTarget: saleHeaderSaleDateInput,
        },
        {
          startSaleWorkflow: () => {
            ensureSaleEntryInitialized();
          },
        }
      );
    }

    if (
      bundleForm &&
      bundleTitleInput &&
      bundleSupplierSelect &&
      bundleSelectedBooks &&
      bundlePriceInput &&
      bundleSubmitBtn
    ) {
      bundleCreatorApi?.dispose?.();
      bundleCreatorApi = initBundleCreator(
        {
          form: bundleForm,
          titleInput: bundleTitleInput,
          supplierSelect: bundleSupplierSelect,
          selectedBooksList: bundleSelectedBooks,
          priceInput: bundlePriceInput,
          priceMsg: bundlePriceMsg,
          msgEl: bundleMsg,
          submitBtn: bundleSubmitBtn,
          recommendedHint: bundleRecommendedHint,
          resetBtn: bundleResetBtn,
          bookSearchInput: bundleBookInput,
        },
        {
          firebase: { db, collection, addDoc, serverTimestamp },
          auth: { currentUser: user },
          createBookLookup: (config = {}) => createBundleBookLookup(config),
          onBundleCreated: (bundle) => showBundleStatusPanel(bundle),
        }
      );
      bundleCreatorApi?.setSuppliers?.(latestSupplierOptions);
    }

    ensureBundleListReady();
    subscribeBundlesForList();

  },
  onSignOut() {
    unsubscribeSuppliers?.();
    unsubscribeSuppliers = null;
    unsubscribeBundleList?.();
    unsubscribeBundleList = null;
    inventoryApi?.dispose?.();
    inventoryApi = null;
    editorApi = null;
    supplierMasterApi?.dispose?.();
    supplierMasterApi = null;
    customerMasterApi?.dispose?.();
    customerMasterApi = null;
    saleEntryLauncherApi?.dispose?.();
    saleEntryLauncherApi = null;
    disposeSaleEntry?.();
    disposeSaleEntry = null;
    saleEntryInitialized = false;
    saleHeaderApi = null;
    saleCustomerLookupApi = null;
    saleLineItemsApi = null;
    saleTitleAutocompleteApi = null;
    salePersistApi = null;
    latestSaleHeaderPayload = null;
    bundleCreatorApi?.dispose?.();
    bundleCreatorApi = null;
    bundleStatusPanelApi?.dispose?.();
    bundleStatusPanelApi = null;
    if (bundleStatusPanel) {
      bundleStatusPanel.hidden = true;
    }
    bundleListApi?.dispose?.();
    bundleListApi = null;
    latestBundleDocs = [];
    bundleBookCache.clear();
    bundleSnapshotVersion = 0;
    currentAdminUser = null;
  },
});

// ---- Search cover image helper ----
function openCoverSearch() {
  const title = (addForm.elements['title']?.value || '').trim();
  const author = (addForm.elements['author']?.value || '').trim();
  const binding = (addForm.elements['binding']?.value || '').trim();
  const isbn = (addForm.elements['isbn']?.value || '').trim();
  if (!title) {
    alert('Enter a Title first, then click Search cover image.');
    return;
  }
  const parts = [`"${title}"`];
  if (author) parts.push(author);
  if (binding) parts.push(binding);
  parts.push('book cover');
  if (isbn) parts.push(isbn);
  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    parts.join(' ')
  )}`;
  window.open(url, '_blank', 'noopener');
}
searchCoverBtn?.addEventListener('click', openCoverSearch);

function ensureSaleEntryInitialized() {
  if (saleEntryInitialized) {
    return;
  }
  saleEntryInitialized = true;
  if (
    !saleHeaderForm ||
    !saleHeaderSaleDateInput ||
    !saleHeaderCustomerSummary ||
    !saleHeaderCustomerId ||
    !saleHeaderContinueBtn ||
    !saleHeaderMsg ||
    !saleCustomerLookupSearch ||
    !saleCustomerLookupList ||
    !saleCustomerLookupEmpty ||
    !saleLineDraftForm ||
    !saleLineDraftLabel ||
    !saleLineBookTitle ||
    !saleLineSuggestions ||
    !saleLineSupplierSelect ||
    !saleLineBookIdInput ||
    !saleLineSummary ||
    !saleLinePriceInput ||
    !saleLineAddBtn ||
    !saleLineMsg ||
    !saleLineItemsBody ||
    !saleLineTotalsCount ||
    !saleLineTotalsAmount ||
    !salePersistBtn ||
    !salePersistMsg ||
    !saleLineStatusList
  ) {
    saleEntryInitialized = false;
    return;
  }

  disposeSaleEntry?.();
  const cleanup = [];
  const headerState = createHeaderStateController();
  latestSaleHeaderPayload = null;

  const customerBridge = createSelectionBridge();
  const firebaseDeps = {
    db,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
  };

  saleCustomerLookupApi = initCustomerLookup(
    {
      searchInput: saleCustomerLookupSearch,
      listEl: saleCustomerLookupList,
      emptyEl: saleCustomerLookupEmpty,
    },
    {
      onSelect(customer) {
        customerBridge.emit(customer);
      },
    },
    firebaseDeps
  );

  saleHeaderApi = initSaleHeader(
    {
      form: saleHeaderForm,
      saleDateInput: saleHeaderSaleDateInput,
      customerSummary: saleHeaderCustomerSummary,
      customerIdInput: saleHeaderCustomerId,
      continueBtn: saleHeaderContinueBtn,
      msgEl: saleHeaderMsg,
    },
    {
      lookup: customerBridge,
      onHeaderReady(payload) {
        latestSaleHeaderPayload = payload;
        headerState.setReady(true);
      },
      serverTimestamp,
    }
  );

  const headerResetHandler = () => {
    latestSaleHeaderPayload = null;
    headerState.setReady(false);
  };
  saleHeaderForm.addEventListener('reset', headerResetHandler);
  cleanup.push(() => saleHeaderForm.removeEventListener('reset', headerResetHandler));

  const bookBridge = createSelectionBridge();
  saleTitleAutocompleteApi = initSaleTitleAutocomplete(
    {
      input: saleLineBookTitle,
      list: saleLineSuggestions,
      hiddenInput: saleLineBookIdInput,
      summaryEl: saleLineSummary,
      msgEl: saleLineBookTitleMsg,
    },
    {
      loadBooks: loadSaleBooks,
      onBookSelect(book) {
        bookBridge.emit(book);
      },
      onNoMatch(query) {
        console.info('No catalog match for query:', query);
      },
    }
  );

  saleLineItemsApi = initSaleLineItems(
    {
      draftForm: saleLineDraftForm,
      draftLabelEl: saleLineDraftLabel,
      supplierSelect: saleLineSupplierSelect,
      bookTitleInput: saleLineBookTitle,
      selectedBookSummary: saleLineSummary,
      bookIdInput: saleLineBookIdInput,
      priceInput: saleLinePriceInput,
      addLineBtn: saleLineAddBtn,
      msgEl: saleLineMsg,
      removalStatusEl: saleLineRemovalStatus,
      lineItemsBody: saleLineItemsBody,
      totalsCountEl: saleLineTotalsCount,
      totalsAmountEl: saleLineTotalsAmount,
      statusList: saleLineStatusList,
      persistBtn: salePersistBtn,
      persistMsg: salePersistMsg,
    },
    {
      lookup: bookBridge,
      formatCurrency: formatSaleCurrency,
      headerState,
    }
  );
  saleLineItemsApi?.setSuppliers?.(latestSupplierOptions);

  salePersistApi = initSalePersist(
    {
      submitBtn: salePersistBtn,
      msgEl: salePersistMsg,
      lineStatusList: saleLineStatusList,
    },
    {
      db,
      collection,
      addDoc,
      serverTimestamp,
      formatCurrency: formatSaleCurrency,
      getHeaderPayload: () => latestSaleHeaderPayload,
      getLineItems: () => saleLineItemsApi?.getLines?.() || [],
      onPersisted() {
        latestSaleHeaderPayload = null;
        headerState.setReady(false);
        saleHeaderForm.reset();
        saleLineItemsApi?.clearLines?.();
        saleLineItemsApi?.resetDraft?.();
      },
    }
  );

  disposeSaleEntry = () => {
    cleanup.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('sale entry cleanup error', error);
      }
    });
    saleHeaderApi?.dispose?.();
    saleCustomerLookupApi?.dispose?.();
    saleLineItemsApi?.dispose?.();
    saleTitleAutocompleteApi?.dispose?.();
    salePersistApi?.dispose?.();
  };
}

async function loadSaleBooks() {
  try {
    const booksRef = collection(db, 'books');
    const queryRef =
      typeof query === 'function' && typeof orderBy === 'function' && typeof limit === 'function'
        ? query(booksRef, orderBy('title'), limit(200))
        : booksRef;
    const snapshot = await getDocs(queryRef);
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
      .filter((book) => (book.status || 'available') !== 'sold');
  } catch (error) {
    console.error('Failed to load catalog titles for sale entry', error);
    return [];
  }
}

async function loadBooksForSupplier(supplierId) {
  if (!supplierId) {
    return [];
  }
  const cached = supplierBooksCache.get(supplierId);
  const nowTs = Date.now();
  if (cached?.data) {
    if (nowTs - cached.timestamp < SUPPLIER_BOOK_CACHE_TTL_MS) {
      return cached.data;
    }
    supplierBooksCache.delete(supplierId);
  }
  if (cached?.promise) {
    return cached.promise;
  }
  const fetchPromise = (async () => {
    try {
      const booksRef = collection(db, 'books');
      const constraints =
        typeof where === 'function' ? [where('supplierId', '==', supplierId)] : [];
      const queryRef =
        constraints.length && typeof query === 'function'
          ? query(booksRef, ...constraints)
          : booksRef;
      const snapshot = await getDocs(queryRef);
      const supplierMeta =
        latestSupplierOptions.find((sup) => sup.id === supplierId) || null;
      const books = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            ...data,
            supplier:
              data.supplier ||
              (supplierMeta
                ? {
                    id: supplierMeta.id,
                    name: supplierMeta.name,
                    location: supplierMeta.location,
                  }
                : null),
          };
        })
        .filter((book) => (book.status || 'available') !== 'sold');
      supplierBooksCache.set(supplierId, { data: books, timestamp: Date.now() });
      return books;
    } catch (error) {
      console.error('Failed to load bundle titles', error);
      supplierBooksCache.delete(supplierId);
      return [];
    }
  })();
  supplierBooksCache.set(supplierId, { promise: fetchPromise });
  return fetchPromise;
}

function formatSaleCurrency(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) {
    return '₹0.00';
  }
  return `₹${value.toFixed(2)}`;
}

function createBundleBookLookup(config = {}) {
  if (
    !bundleBookInput ||
    !bundleBookSuggestions ||
    !bundleBookHiddenInput ||
    !bundleBookSummary
  ) {
    return null;
  }
  const { supplierId, onSelect, onNoMatch } = config;
  if (!supplierId) return null;
  return initSaleTitleAutocomplete(
    {
      input: bundleBookInput,
      list: bundleBookSuggestions,
      hiddenInput: bundleBookHiddenInput,
      summaryEl: bundleBookSummary,
      msgEl: bundleBookMsg,
    },
    {
      loadBooks: () => loadBooksForSupplier(supplierId),
      onBookSelect(book) {
        if (bundleBookMsg) {
          bundleBookMsg.textContent = '';
        }
        if (typeof onSelect === 'function') {
          onSelect(book);
        }
        bundleBookHiddenInput.value = '';
        bundleBookInput.value = '';
        bundleBookSummary.dataset.empty = 'true';
        bundleBookSummary.textContent =
          bundleBookSummary.dataset.defaultSummary || 'No book selected.';
      },
      onNoMatch(query) {
        if (bundleBookMsg) {
          bundleBookMsg.textContent = query
            ? 'No catalog match found for this supplier.'
            : '';
        }
        if (typeof onNoMatch === 'function') {
          onNoMatch(query);
        }
      },
      debounceMs: 150,
    }
  );
}

function createBundleListLookup(config = {}) {
  if (!config?.input || !config?.list || !config?.hiddenInput) {
    return null;
  }
  const summaryEl =
    config.summaryEl ||
    createHiddenSummary(config.input, 'No book selected.');
  return initSaleTitleAutocomplete(
    {
      input: config.input,
      list: config.list,
      hiddenInput: config.hiddenInput,
      summaryEl,
      msgEl: config.msgEl,
    },
    {
      loadBooks: () => loadSaleBooks(),
      onBookSelect(book) {
        if (typeof config.onSelect === 'function') {
          config.onSelect(book);
        }
      },
      onNoMatch(query) {
        if (typeof config.onNoMatch === 'function') {
          config.onNoMatch(query);
        } else if (config.msgEl) {
          config.msgEl.textContent = query
            ? 'No catalog match found.'
            : '';
        }
      },
      debounceMs: config.debounceMs ?? 150,
    }
  );
}

function createHiddenSummary(input, defaultText) {
  const el = document.createElement('p');
  el.dataset.empty = 'true';
  el.textContent = defaultText || 'No selection.';
  el.hidden = true;
  input?.parentElement?.appendChild(el);
  return el;
}

function createSelectionBridge() {
  const listeners = new Set();
  return {
    onSelect(cb) {
      if (typeof cb !== 'function') return () => {};
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    offSelect(cb) {
      listeners.delete(cb);
    },
    emit(payload) {
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error('sale selection listener failed', error);
        }
      });
    },
  };
}

function createHeaderStateController() {
  let ready = false;
  const listeners = new Set();
  return {
    isReady: () => ready,
    onReadyChange(cb = () => {}) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    setReady(nextReady) {
      ready = Boolean(nextReady);
      listeners.forEach((listener) => {
        try {
          listener(ready);
        } catch (error) {
          console.error('sale header state listener failed', error);
        }
      });
    },
  };
}
