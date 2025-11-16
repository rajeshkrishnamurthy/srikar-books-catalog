import { jest } from '@jest/globals';

const inventoryModuleUrl = new URL('../../scripts/admin/inventory.js', import.meta.url);

export async function createAdminInventoryHarness(options = {}) {
  const {
    firebaseOverrides = {},
    onScrollIntoView = jest.fn(),
    paginationControllerFactory,
  } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom(onScrollIntoView);
  const firebase = buildFirebaseMocks(firebaseOverrides);
  globalThis.__firebaseMocks = firebase;

  const { initInventory } = await import(inventoryModuleUrl.href);
  const inventoryApi = initInventory({
    addForm: null,
    addMsg: null,
    availablePanel: dom.availablePanel,
    availList: dom.availList,
    soldPanel: dom.soldPanel,
    soldList: dom.soldList,
    availableSearchInput: dom.availableSearchInput,
    searchStatus: dom.searchStatus,
    createPaginationController: paginationControllerFactory,
  });

  return {
    scrollIntoViewMock: onScrollIntoView,
    availablePanel: dom.availablePanel,
    availableSearchInput: dom.availableSearchInput,
    availList: dom.availList,
    soldList: dom.soldList,
    searchStatus: dom.searchStatus,
    mocks: firebase.mocks,
    inventoryApi,
    emitAvailableDocs(docs = []) {
      const cb = firebase.listeners.available;
      if (cb) cb(makeSnapshot(docs));
    },
    emitSoldDocs(docs = []) {
      const cb = firebase.listeners.sold;
      if (cb) cb(makeSnapshot(docs));
    },
  };
}

function buildDom(onScrollIntoView) {
  document.body.innerHTML = `
    <details id="availableBooksPanel" open>
      <summary>
        <div class="available-summary">
          <strong>Available</strong>
          <label id="availableSearchLabel" class="sr-only" for="availableSearchInput">
            Search available books
          </label>
          <input
            id="availableSearchInput"
            type="search"
            placeholder="Search title or author"
            aria-labelledby="availableSearchLabel"
          />
        </div>
      </summary>
      <p id="availableSearchStatus" aria-live="polite" class="sr-only"></p>
      <div id="availList"></div>
      <div
        class="inventory-pagination"
        data-available-pagination
        aria-busy="false"
      >
        <p id="availablePaginationSummary" aria-live="polite">Items 0–0 of 0</p>
        <div class="inventory-pagination__controls">
          <button
            type="button"
            id="availablePaginationPrev"
            data-pagination="prev"
            aria-controls="availList"
          >
            Previous page
          </button>
          <button
            type="button"
            id="availablePaginationNext"
            data-pagination="next"
            aria-controls="availList"
          >
            Next page
          </button>
        </div>
      </div>
    </details>
    <details id="soldBooksPanel">
      <summary>Sold</summary>
      <div id="soldList"></div>
    </details>
  `;
  const availablePanel = document.getElementById('availableBooksPanel');
  availablePanel.scrollIntoView = onScrollIntoView;
  return {
    availablePanel,
    availableSearchInput: document.getElementById('availableSearchInput'),
    availList: document.getElementById('availList'),
    soldPanel: document.getElementById('soldBooksPanel'),
    soldList: document.getElementById('soldList'),
    searchStatus: document.getElementById('availableSearchStatus'),
  };
}

function makeSnapshot(rawDocs = []) {
  const docs = rawDocs.map((doc) => ({
    id: doc.id,
    data: () => doc,
  }));
  return { docs };
}

function buildFirebaseMocks(overrides = {}) {
  const listeners = { available: null, sold: null };

  const collection = jest.fn(() => ({ type: 'collection' }));
  const where = jest.fn((field, op, value) => ({
    type: 'where',
    field,
    op,
    value,
  }));
  const orderBy = jest.fn(() => ({ type: 'orderBy' }));
  const query = jest.fn((collectionRef, ...constraints) => {
    const whereConstraint = constraints.find((c) => c.type === 'where');
    const status = whereConstraint?.value === 'sold' ? 'sold' : 'available';
    return { type: 'query', status };
  });
  const onSnapshot = jest.fn((queryRef, cb) => {
    if (queryRef.status === 'available') {
      listeners.available = cb;
    } else if (queryRef.status === 'sold') {
      listeners.sold = cb;
    }
    cb({ docs: [] });
    return () => {};
  });

  const createStub = () => jest.fn().mockResolvedValue();
  const docRef = jest.fn(() => ({ type: 'doc' }));
  const getDoc = jest.fn().mockResolvedValue({ data: () => ({}) });
  const setDoc = createStub();
  const addDoc = createStub();
  const updateDoc = createStub();
  const deleteDoc = createStub();
  const deleteObject = createStub();
  const ref = jest.fn(() => ({ type: 'ref' }));
  const uploadBytes = createStub();
  const getDownloadURL = jest.fn().mockResolvedValue('https://example/image');
  const serverTimestamp = jest.fn(() => 'ts');
  const storage = {};
  const db = {};

  const base = {
    db,
    storage,
    collection,
    addDoc,
    setDoc,
    updateDoc,
    doc: docRef,
    getDoc,
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
  };

  const exports = { ...base, ...overrides };

  return {
    exports,
    mocks: base,
    listeners,
  };
}
