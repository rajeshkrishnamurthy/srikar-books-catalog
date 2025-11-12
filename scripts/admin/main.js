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
  limit,
} from '../lib/firebase.js';
import { escapeHtml } from '../helpers/text.js';

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
const addBookPanel = document.getElementById('addBookPanel');
const availableBooksPanel = document.getElementById('availableBooksPanel');
const soldBooksPanel = document.getElementById('soldBooksPanel');
const bookRequestsPanel = document.getElementById('bookRequestsPanel');
const suppliersPanel = document.getElementById('suppliersPanel');

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
const reqOpen = document.getElementById('reqOpen');
const reqClosed = document.getElementById('reqClosed');
const searchCoverBtn = document.getElementById('searchCoverBtn');
const coverPreviewEl = document.getElementById('coverPreview');
const adminSearch = document.getElementById('adminSearch');
const supplierForm = document.getElementById('supplierForm');
const supplierNameInput = document.getElementById('supplierNameInput');
const supplierLocationInput = document.getElementById('supplierLocationInput');
const supplierMsg = document.getElementById('supplierMsg');
const supplierList = document.getElementById('supplierList');
const supplierIdInput = document.getElementById('supplierIdInput');
const supplierCancelBtn = document.getElementById('supplierCancelBtn');
const supplierSelect = document.getElementById('supplierSelect');
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
const saleCustomerLookupClear = document.getElementById('saleCustomerLookupClear');
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
const saleLineSupplierHint = document.getElementById('saleLineSupplierHint');
const saleLinePurchaseHint = document.getElementById('saleLinePurchaseHint');
const saleLineSellingHint = document.getElementById('saleLineSellingHint');
const saleLineTotalsCount = document.getElementById('saleLineTotalsCount');
const saleLineTotalsAmount = document.getElementById('saleLineTotalsAmount');
const salePersistBtn = document.getElementById('salePersistBtn');
const salePersistMsg = document.getElementById('salePersistMsg');
const saleLineStatusList = document.getElementById('saleLineStatusList');
const saleLineBookTitleMsg = saleTitleMsg;
const recordSaleBtn = document.getElementById('recordSaleBtn');
const saleEntryPanel = document.getElementById('saleEntryPanel');
let inventoryApi = null; // <-- make it visible to the search handler
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

adminSearch?.addEventListener('input', () => {
  // guard: before auth, inventoryApi is null and the admin section is hidden anyway
  inventoryApi?.setFilter(adminSearch.value);
});

adminNav?.addEventListener('click', (event) => {
  const button = event.target?.closest('button[data-nav]');
  if (!button) return;
  const navKey = button.dataset.nav;
  if (!navKey) return;
  handleAdminNav(navKey, button);
});

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
      applySuppliersToConsumers();
    },
    (err) => console.error('suppliers select snapshot error:', err)
  );
}

function handleAdminNav(navKey, button) {
  if (!navKey || !button) return;
  setActiveNav(button);
  switch (navKey) {
    case 'manageBooks':
      ensurePanelVisible(addBookPanel);
      ensurePanelVisible(availableBooksPanel);
      ensurePanelVisible(soldBooksPanel);
      scrollPanelIntoView(manageBooksAnchor || addBookPanel);
      break;
    case 'recordSale':
      revealSaleEntryPanel();
      break;
    case 'bookRequests':
      ensurePanelVisible(bookRequestsPanel);
      scrollPanelIntoView(bookRequestsPanel);
      break;
    case 'suppliers':
      ensurePanelVisible(suppliersPanel);
      scrollPanelIntoView(suppliersPanel);
      break;
    default:
      break;
  }
}

function setActiveNav(activeButton) {
  if (!adminNav) return;
  adminNav.querySelectorAll('.admin-nav__item').forEach((btn) => {
    btn.classList.toggle('is-active', btn === activeButton);
  });
}

function ensurePanelVisible(panel) {
  if (!panel) return;
  panel.removeAttribute?.('hidden');
  if (panel.tagName === 'DETAILS') {
    panel.open = true;
  }
}

function scrollPanelIntoView(target) {
  target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

function revealSaleEntryPanel() {
  ensurePanelVisible(saleEntryPanel);
  ensureSaleEntryInitialized();
  scrollPanelIntoView(saleEntryPanel);
  saleHeaderSaleDateInput?.focus?.();
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

initAuth({
  authEl,
  adminEl,
  loginForm,
  emailInput,
  passwordInput,
  authError,
  signOutBtn,
  onAuthed() {
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
      supplierSelect,
      onEdit: editor.open,
    });
    applySuppliersToConsumers();
    subscribeSuppliersForAdd();

    // Wire admin search
    const adminSearchEl = document.getElementById('adminSearch');
    adminSearchEl?.addEventListener('input', () => {
      inventoryApi?.setFilter(adminSearchEl.value);
    });

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
          searchInput: adminSearch,
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

  },
  onSignOut() {
    unsubscribeSuppliers?.();
    unsubscribeSuppliers = null;
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
      clearBtn: saleCustomerLookupClear,
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
      lineItemsBody: saleLineItemsBody,
      supplierHintEl: saleLineSupplierHint,
      purchaseHintEl: saleLinePurchaseHint,
      sellingHintEl: saleLineSellingHint,
      totalsCountEl: saleLineTotalsCount,
      totalsAmountEl: saleLineTotalsAmount,
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

function formatSaleCurrency(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) {
    return '₹0.00';
  }
  return `₹${value.toFixed(2)}`;
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
