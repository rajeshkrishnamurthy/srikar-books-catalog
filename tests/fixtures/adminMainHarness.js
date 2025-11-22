import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const mainModuleUrl = new URL('../../scripts/admin/main.js', import.meta.url);
const dataModuleUrl = new URL('../../scripts/helpers/data.js', import.meta.url);

const resolveModulePath = (relativePath) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export async function createAdminMainHarness(options = {}) {
  const {
    initialHash = '',
    initialSearch = '',
    manageBundles = {},
  } = options;

  jest.resetModules();
  jest.clearAllMocks();
  delete globalThis.__firebaseMocks;

  setHarnessLocation(initialHash, initialSearch);
  buildDom();
  const resetDom = () => {
    document.body.innerHTML = '';
    setHarnessLocation('', '');
  };
  const cleanupTasks = [resetDom];

  const firebase = buildFirebaseMocks();
  globalThis.__firebaseMocks = firebase;
  cleanupTasks.push(() => {
    delete globalThis.__firebaseMocks;
  });

  const mocks = await setupModuleMocks({ manageBundles });
  await import(mainModuleUrl.href);

  const authCall = mocks.initAuth.mock.calls[0];
  if (!authCall) {
    throw new Error('initAuth was not invoked for admin main harness');
  }

  const authConfig = authCall[0] || {};
  if (typeof authConfig.onAuthed !== 'function') {
    throw new Error('initAuth config is missing onAuthed handler');
  }

  return {
    mocks,
    async simulateSignIn(user = { uid: 'admin-harness' }) {
      await authConfig.onAuthed(user);
    },
    cleanup() {
      while (cleanupTasks.length) {
        const task = cleanupTasks.shift();
        try {
          task();
        } catch (error) {
          console.error('adminMainHarness cleanup error', error);
        }
      }
    },
    get addBookPanel() {
      return document.getElementById('addBookPanel');
    },
    get bookRequestsPanel() {
      return document.getElementById('bookRequestsPanel');
    },
    get suppliersPanel() {
      return document.getElementById('suppliersPanel');
    },
    get manageNavButton() {
      return document.querySelector('#adminNav [data-nav="manageBooks"]');
    },
    get bookRequestsNavButton() {
      return document.querySelector('#adminNav [data-nav="bookRequests"]');
    },
    get suppliersNavButton() {
      return document.querySelector('#adminNav [data-nav="suppliers"]');
    },
    get bundlesNavButton() {
      return document.querySelector('#adminNav [data-nav="bundles"]');
    },
    get recordSaleNavButton() {
      return document.querySelector('#adminNav [data-nav="recordSale"]');
    },
    get customersNavButton() {
      return document.querySelector('#adminNav [data-nav="customers"]');
    },
    get locationHash() {
      return window.location.hash;
    },
    get customersPanelSection() {
      return document.getElementById('customerPanel')?.closest('.panel') || null;
    },
    get customersPanelSummary() {
      return (
        document
          .getElementById('customerPanel')
          ?.closest('.panel')
          ?.querySelector('summary, [data-customer-panel-heading]') || null
      );
    },
  };
}

function setHarnessLocation(hashValue = '', searchValue = '') {
  try {
    const current = new URL(window.location.href);
    current.hash = hashValue || '';
    current.search = searchValue || '';
    window.history.replaceState(null, '', current.toString());
  } catch {
    window.location.hash = hashValue || '';
  }
}

function buildDom() {
  document.body.innerHTML = `
    <section id="auth">
      <form id="loginForm">
        <input id="email" type="email" />
        <input id="password" type="password" />
        <button type="submit">Sign in</button>
      </form>
      <p id="authError"></p>
    </section>
    <section id="admin" style="display: none">
      <button id="signOutBtn" type="button">Sign out</button>
      <nav id="adminNav" aria-label="Admin sections" role="tablist">
        <button
          type="button"
          class="admin-nav__item is-active"
          role="tab"
          id="navTab-manageBooks"
          aria-controls="addBookPanel"
          aria-expanded="true"
          data-nav="manageBooks"
        >
          Manage books
        </button>
        <button
          type="button"
          class="admin-nav__item"
          role="tab"
          id="navTab-bundles"
          aria-controls="bundlesPanel"
          aria-expanded="false"
          data-nav="bundles"
        >
          Bundles
        </button>
        <button
          type="button"
          class="admin-nav__item"
          role="tab"
          id="recordSaleBtn"
          aria-controls="saleEntryPanel"
          aria-expanded="false"
          data-nav="recordSale"
        >
          Sale
        </button>
        <button
          type="button"
          class="admin-nav__item"
          role="tab"
          id="navTab-bookRequests"
          aria-controls="bookRequestsPanel"
          aria-expanded="false"
          data-nav="bookRequests"
        >
          Book requests
        </button>
        <button
          type="button"
          class="admin-nav__item"
          role="tab"
          id="navTab-suppliers"
          aria-controls="suppliersPanel"
          aria-expanded="false"
          data-nav="suppliers"
        >
          Suppliers
        </button>
        <button
          type="button"
          class="admin-nav__item"
          role="tab"
          id="navTab-customers"
          aria-controls="customersPanel"
          aria-expanded="false"
          data-nav="customers"
        >
          Customers
        </button>
      </nav>
      <div id="manageBooksAnchor"></div>
      <div class="manage-sub-nav" id="manageSubNav" data-parent-nav="manageBooks" hidden>
        <button class="manage-sub-nav__item is-active" data-manage-tab="add" aria-current="page">
          Add
        </button>
        <button class="manage-sub-nav__item" data-manage-tab="available">Available</button>
        <button class="manage-sub-nav__item" data-manage-tab="sold">Sold</button>
      </div>
      <div class="manage-sub-nav" id="bundlesSubNav" data-parent-nav="bundles" hidden>
        <button class="manage-sub-nav__item is-active" data-manage-tab="create" aria-current="page">
          Create
        </button>
        <button class="manage-sub-nav__item" data-manage-tab="manage">Manage</button>
      </div>
      <div class="manage-sub-nav" id="saleSubNav" data-parent-nav="recordSale" hidden>
        <button class="manage-sub-nav__item is-active" data-manage-tab="record" aria-current="page">
          Record
        </button>
      </div>
      <div class="manage-sub-nav" id="bookRequestsSubNav" data-parent-nav="bookRequests" hidden>
        <button class="manage-sub-nav__item is-active" data-manage-tab="open" aria-current="page">
          Open
        </button>
        <button class="manage-sub-nav__item" data-manage-tab="closed">Closed</button>
      </div>
      <div class="manage-sub-nav" id="suppliersSubNav" data-parent-nav="suppliers" hidden>
        <button class="manage-sub-nav__item is-active" data-manage-tab="create" aria-current="page">
          Create
        </button>
        <button class="manage-sub-nav__item" data-manage-tab="manage">Manage</button>
      </div>
      <div class="manage-sub-nav" id="customersSubNav" data-parent-nav="customers" hidden>
        <button class="manage-sub-nav__item is-active" data-manage-tab="create" aria-current="page">
          Create
        </button>
        <button class="manage-sub-nav__item" data-manage-tab="manage">Manage</button>
      </div>
      <details id="addBookPanel" class="panel" open></details>
              <details id="availableBooksPanel" class="panel" hidden>
          <summary>
            <div class="available-summary">
              <strong>Available</strong>
              <label id="availableSearchLabel" class="sr-only" for="availableSearchInput">
                Search available books
              </label>
              <input id="availableSearchInput" type="search" placeholder="Search available" />
            </div>
          </summary>
          <p id="availableSearchStatus" aria-live="polite" class="sr-only"></p>
          <div id="availList"></div>
        </details>
      <details id="soldBooksPanel" class="panel" hidden></details>
      <details id="bookRequestsPanel" class="panel" open>
        <div id="bookRequestsOpenPanel">
          <div id="reqOpen"></div>
        </div>
        <div id="bookRequestsClosedPanel" hidden>
          <div id="reqClosed"></div>
        </div>
      </details>
      <details id="suppliersPanel" class="panel" open>
        <div id="supplierCreatePanel">
          <form id="supplierForm">
            <input id="supplierNameInput" />
            <input id="supplierLocationInput" />
            <input type="hidden" id="supplierIdInput" />
            <button id="supplierCancelBtn" type="button"></button>
          </form>
          <p id="supplierMsg"></p>
        </div>
        <div id="supplierManagePanel" hidden>
          <ul id="supplierList"></ul>
        </div>
      </details>
      <details id="customersPanel" class="panel">
        <summary data-customer-panel-heading>Customer master</summary>
        <div id="customerPanel">
          <section id="customerCreatePanel">
            <form id="customerForm">
              <input id="customerIdInput" type="hidden" />
              <input id="customerNameInput" name="customerName" />
              <textarea id="customerAddressInput"></textarea>
              <input id="customerLocationInput" />
              <input id="customerWhatsAppInput" />
              <button id="customerCancelBtn" type="button"></button>
              <p id="customerMsg"></p>
            </form>
          </section>
          <section id="customerManagePanel" hidden>
            <ul id="customerList"></ul>
          </section>
        </div>
      </details>
      <section id="bundlesPanel" class="panel" hidden>
        <div id="bundleCreatePanel">
          <h3>Create a bundle</h3>
          <form id="bundleForm"></form>
          <p id="bundleMsg"></p>
          <hr aria-hidden="true" />
        </div>
        <section id="bundleManagePanel" hidden>
          <div class="bundle-manage-card">
            <div class="bundle-list-filters">
              <label for="bundleSearchInput">Search bundles</label>
              <div id="bundleSearchInputWrap">
                <div id="bundleSearchSummary" class="bundle-selected-chip" data-empty="true">
                  <span class="bundle-selected-chip__label">No book selected.</span>
                  <button type="button" class="bundle-selected-chip__clear">×</button>
                </div>
                <input id="bundleSearchInput" class="bundle-search-input-field" type="search" aria-controls="bundleSearchSuggestions" />
                <input type="hidden" id="bundleSearchHiddenInput" />
              </div>
              <ul id="bundleSearchSuggestions" role="listbox"></ul>
              <p id="bundleSearchMsg" class="md-helper"></p>
              <label for="bundleFilterSupplier">Supplier</label>
              <select id="bundleFilterSupplier">
                <option value="">All suppliers</option>
                <option value="sup-1">Lotus Books</option>
                <option value="sup-2">Paper Trail</option>
              </select>
              <label for="bundleFilterStatus">Status</label>
              <select id="bundleFilterStatus">
                <option value="">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </div>
            <div id="bundlePagination" class="pagination-shell" aria-busy="false">
              <div class="pagination-shell__summary">
                <p id="bundlePaginationSummary" aria-live="polite">Bundles 0–0 of 0</p>
              </div>
              <div class="pagination-shell__controls">
                <label for="bundlePaginationSize">Rows per page</label>
                <select id="bundlePaginationSize">
                  <option value="10">10</option>
                  <option value="20" selected>20</option>
                  <option value="50">50</option>
                </select>
                <div id="bundlePaginationPages" role="group" aria-label="Page selection"></div>
                <button type="button" id="bundlePaginationPrev" aria-label="Previous bundles">Prev</button>
                <button type="button" id="bundlePaginationNext" aria-label="Next bundles">Next</button>
              </div>
            </div>
            <div id="bundleResults" class="bundle-results"></div>
            <p id="bundleEmpty" hidden>No bundles found.</p>
          </div>
        </section>
      </section>
    </section>
    <section id="saleEntryPanel" hidden></section>
    <form id="addForm"></form>
    <input id="authorInput" />
    <datalist id="authorList"></datalist>
  `;
}

function buildFirebaseMocks() {
  const stub = () => {};
  const collection = jest.fn(() => ({}));
  const doc = jest.fn(() => ({}));
  const addDoc = jest.fn().mockResolvedValue({});
  const setDoc = jest.fn().mockResolvedValue();
  const updateDoc = jest.fn().mockResolvedValue();
  const deleteDoc = jest.fn().mockResolvedValue();
  const serverTimestamp = jest.fn(() => 'ts');
  const ref = jest.fn(() => ({}));
  const uploadBytes = jest.fn().mockResolvedValue();
  const getDownloadURL = jest.fn().mockResolvedValue('https://example.com/cover.jpg');
  const deleteObject = jest.fn().mockResolvedValue();
  const where = jest.fn(() => ({}));
  const orderBy = jest.fn(() => ({}));
  const query = jest.fn(() => ({}));
  const onSnapshot = jest.fn((queryRef, callback) => {
    if (typeof callback === 'function') {
      callback({ docs: [] });
    }
    return stub;
  });
  const getDocs = jest.fn().mockResolvedValue({ docs: [] });
  const limit = jest.fn(() => ({}));
  const getDoc = jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({}),
  });

  const exports = {
    db: {},
    storage: {},
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    where,
    orderBy,
    query,
    onSnapshot,
    getDocs,
    limit,
    getDoc,
  };

  return { exports };
}

async function setupModuleMocks(overrides = {}) {
  const { manageBundles = {} } = overrides;
  const initAuth = jest.fn();
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/auth.js'), () => ({
    initAuth,
  }));

  const noOp = () => ({ dispose: jest.fn() });

  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/autoPrice.js'), () => ({
    bindAutoPrice: jest.fn(() => jest.fn()),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/lookup.js'), () => ({
    wireLookup: jest.fn(),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/inventory.js'), () => ({
    initInventory: jest.fn(() => ({
      setSuppliers: jest.fn(),
      dispose: jest.fn(),
    })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/requests.js'), () => ({
    initRequests: jest.fn(),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/editor.js'), () => ({
    initEditor: jest.fn(() => ({ open: jest.fn(), dispose: jest.fn() })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/suppliers.js'), () => ({
    initSupplierMaster: jest.fn(noOp),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/customers.js'), () => ({
    initCustomerMaster: jest.fn(noOp),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/salesHeader.js'), () => ({
    initSaleHeader: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/salesLineItems.js'), () => ({
    initSaleLineItems: jest.fn(() => ({
      dispose: jest.fn(),
      setSuppliers: jest.fn(),
      getLines: jest.fn(() => []),
      clearLines: jest.fn(),
      resetDraft: jest.fn(),
    })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/salesTitleAutocomplete.js'), () => ({
    initSaleTitleAutocomplete: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/salesPersist.js'), () => ({
    initSalePersist: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/customerLookup.js'), () => ({
    initCustomerLookup: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/salesEntryLauncher.js'), () => ({
    initSaleEntryLauncher: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/bundles.js'), () => ({
    initBundleCreator: jest.fn(() => ({ dispose: jest.fn(), setSuppliers: jest.fn() })),
  }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/bundleStatus.js'), () => ({
    initBundleStatusPanel: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  const initBundleList =
    manageBundles.initBundleList ||
    jest.fn(() => ({
      dispose: jest.fn(),
      setSuppliers: jest.fn(),
      setBundles: jest.fn(),
      setError: jest.fn(),
    }));
  jest.unstable_mockModule(resolveModulePath('../../scripts/admin/bundleList.js'), () => ({
    initBundleList,
  }));

  if (manageBundles.createPaginationController) {
    const actualDataModule = await import(dataModuleUrl.href);
    const dataExports = { ...actualDataModule };
    dataExports.createPaginationController =
      manageBundles.createPaginationController;
    jest.unstable_mockModule(resolveModulePath('../../scripts/helpers/data.js'), () => dataExports);
  }

  return {
    initAuth,
    createPaginationController: manageBundles.createPaginationController,
    initBundleList,
  };
}
