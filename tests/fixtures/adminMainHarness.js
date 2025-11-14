import { jest } from '@jest/globals';

const mainModuleUrl = new URL('../../scripts/admin/main.js', import.meta.url);

export async function createAdminMainHarness(options = {}) {
  const { initialHash = '', initialSearch = '' } = options;

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

  const mocks = setupModuleMocks();
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
          Create bundles
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
          Record sale
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
      <div id="manageSubNav" data-parent-nav="manageBooks" hidden>
        <button data-manage-tab="add" aria-current="page">Add</button>
        <button data-manage-tab="available">Available</button>
        <button data-manage-tab="sold">Sold</button>
      </div>
      <details id="addBookPanel" class="panel" open></details>
      <details id="availableBooksPanel" class="panel" open></details>
      <details id="soldBooksPanel" class="panel"></details>
      <details id="bookRequestsPanel" class="panel" open></details>
      <details id="suppliersPanel" class="panel" open></details>
      <details id="customersPanel" class="panel">
        <summary data-customer-panel-heading>Customer master</summary>
        <div id="customerPanel">
          <form id="customerForm">
            <input id="customerNameInput" name="customerName" />
          </form>
        </div>
      </details>
      <section id="bundlesPanel" class="panel" hidden></section>
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

function setupModuleMocks() {
  const initAuth = jest.fn();
  jest.unstable_mockModule('../../scripts/admin/auth.js', () => ({
    initAuth,
  }));

  const noOp = () => ({ dispose: jest.fn() });

  jest.unstable_mockModule('../../scripts/admin/autoPrice.js', () => ({
    bindAutoPrice: jest.fn(() => jest.fn()),
  }));
  jest.unstable_mockModule('../../scripts/admin/lookup.js', () => ({
    wireLookup: jest.fn(),
  }));
  jest.unstable_mockModule('../../scripts/admin/inventory.js', () => ({
    initInventory: jest.fn(() => ({
      setSuppliers: jest.fn(),
      dispose: jest.fn(),
    })),
  }));
  jest.unstable_mockModule('../../scripts/admin/requests.js', () => ({
    initRequests: jest.fn(),
  }));
  jest.unstable_mockModule('../../scripts/admin/editor.js', () => ({
    initEditor: jest.fn(() => ({ open: jest.fn(), dispose: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/suppliers.js', () => ({
    initSupplierMaster: jest.fn(noOp),
  }));
  jest.unstable_mockModule('../../scripts/admin/customers.js', () => ({
    initCustomerMaster: jest.fn(noOp),
  }));
  jest.unstable_mockModule('../../scripts/admin/salesHeader.js', () => ({
    initSaleHeader: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/salesLineItems.js', () => ({
    initSaleLineItems: jest.fn(() => ({
      dispose: jest.fn(),
      setSuppliers: jest.fn(),
      getLines: jest.fn(() => []),
      clearLines: jest.fn(),
      resetDraft: jest.fn(),
    })),
  }));
  jest.unstable_mockModule('../../scripts/admin/salesTitleAutocomplete.js', () => ({
    initSaleTitleAutocomplete: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/salesPersist.js', () => ({
    initSalePersist: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/customerLookup.js', () => ({
    initCustomerLookup: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/salesEntryLauncher.js', () => ({
    initSaleEntryLauncher: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/bundles.js', () => ({
    initBundleCreator: jest.fn(() => ({ dispose: jest.fn(), setSuppliers: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/bundleStatus.js', () => ({
    initBundleStatusPanel: jest.fn(() => ({ dispose: jest.fn() })),
  }));
  jest.unstable_mockModule('../../scripts/admin/bundleList.js', () => ({
    initBundleList: jest.fn(() => ({ dispose: jest.fn(), setSuppliers: jest.fn(), setBundles: jest.fn(), setError: jest.fn() })),
  }));

  return { initAuth };
}
