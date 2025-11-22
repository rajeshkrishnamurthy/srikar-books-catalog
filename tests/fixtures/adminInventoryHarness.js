import { jest } from '@jest/globals';

const inventoryModuleUrl = new URL('../../scripts/admin/inventory.js', import.meta.url);

export async function createAdminInventoryHarness(options = {}) {
  const {
    firebaseOverrides = {},
    onScrollIntoView = jest.fn(),
    paginationControllerFactory,
    domSource,
  } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom(onScrollIntoView, domSource);
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
    soldPanel: dom.soldPanel,
    soldList: dom.soldList,
    soldPagination: dom.soldPagination,
    soldSummary: dom.soldSummary,
    soldPrevButton: dom.soldPrevButton,
    soldNextButton: dom.soldNextButton,
    soldPageSizeSelect: dom.soldPageSizeSelect,
    searchStatus: dom.searchStatus,
    pageSizeSelect: dom.pageSizeSelect,
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

function buildDom(onScrollIntoView, domSource) {
  if (typeof domSource === 'string' && domSource.trim()) {
    if (typeof DOMParser === 'function') {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(domSource, 'text/html');
      parsed.querySelectorAll('script').forEach((node) => node.remove());
      const bodyMarkup = parsed.body?.innerHTML || domSource;
      document.body.innerHTML = bodyMarkup;
    } else {
      document.body.innerHTML = domSource;
    }
  } else {
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
      <div
        class="inventory-pagination pagination-shell"
        data-available-pagination
        aria-busy="false"
      >
        <div class="inventory-pagination__summary pagination-shell__summary">
          <p id="availablePaginationSummary" aria-live="polite">
            Items 0–0 of 0 available books
          </p>
        </div>
        <div class="inventory-pagination__actions inventory-pagination__controls pagination-shell__actions">
          <div class="pagination-size pagination-shell__size">
            <span class="pagination-size__label">Rows per page</span>
            <label for="availablePageSize" class="sr-only">Items per page</label>
            <select id="availablePageSize" aria-label="Items per page" class="pagination-size-select">
              <option value="10">10</option>
              <option value="20" selected>20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div class="pagination-stepper pagination-shell__stepper">
            <button
              type="button"
              id="availablePaginationPrev"
              class="pagination-shell__prev"
              data-pagination="prev"
              aria-controls="availList"
              aria-label="Previous page"
            >
              Prev
            </button>
            <div
              class="inventory-pagination__pages pagination-shell__pages"
              data-pagination-pages
              role="group"
              aria-label="Page selection"
              hidden
            ></div>
            <button
              type="button"
              id="availablePaginationNext"
              class="pagination-shell__next"
              data-pagination="next"
              aria-controls="availList"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div id="availList"></div>
      <section
        id="inlineBundleComposer"
        class="inline-bundle-composer"
        role="region"
        aria-labelledby="inlineBundleHeading"
        hidden
      >
        <header class="inline-bundle-composer__header">
          <h3 id="inlineBundleHeading" tabindex="-1">Bundle in progress</h3>
          <button
            id="inlineBundleClose"
            type="button"
            aria-label="Close bundle composer"
          >
            ×
          </button>
        </header>
        <div class="inline-bundle-composer__body">
          <p id="inlineBundleEmptyState">Add a book to start a bundle</p>
          <div id="inlineBundleSelectedBooks" role="list"></div>
          <div class="inline-bundle-composer__form">
            <label for="inlineBundleName">Bundle name</label>
            <input
              id="inlineBundleName"
              type="text"
              required
              aria-required="true"
              aria-describedby="inlineBundleHelper"
            />
            <label for="inlineBundlePrice">Bundle price</label>
            <input
              id="inlineBundlePrice"
              type="number"
              required
              aria-required="true"
              aria-describedby="inlineBundleHelper"
            />
            <label class="sr-only" for="inlineBundleExistingSelect">
              Continue existing bundle
            </label>
            <select id="inlineBundleExistingSelect"></select>
          </div>
          <dl class="inline-bundle-composer__totals">
            <div>
              <dt>Recommended price</dt>
              <dd id="inlineBundleRecommended">—</dd>
            </div>
            <div>
              <dt>Total sale price</dt>
              <dd id="inlineBundleTotal">—</dd>
            </div>
            <div>
              <dt>Total MRP</dt>
              <dd id="inlineBundleMrp">—</dd>
            </div>
          </dl>
        </div>
        <p id="inlineBundleHelper" class="inline-bundle-composer__helper">
          Bundle name and bundle price are required before saving.
        </p>
        <footer class="inline-bundle-composer__actions">
          <button id="inlineBundleReset" type="button">Clear bundle</button>
          <button id="inlineBundleSave" type="button" disabled>Save bundle</button>
        </footer>
      </section>
    </details>
    <details id="soldBooksPanel">
      <summary>
        <div class="sold-summary">
          <strong>Sold</strong>
        </div>
      </summary>
      <div
        class="inventory-pagination pagination-shell"
        data-sold-pagination
        aria-busy="false"
      >
        <div class="inventory-pagination__summary pagination-shell__summary">
          <p id="soldPaginationSummary" aria-live="polite">
            Items 0–0 of 0 - Sold
          </p>
        </div>
        <div class="inventory-pagination__actions inventory-pagination__controls pagination-shell__actions">
          <div class="pagination-size pagination-shell__size">
            <span class="pagination-size__label">Rows per page</span>
            <label for="soldPageSize" class="sr-only">Items per page</label>
            <select id="soldPageSize" aria-label="Items per page" class="pagination-size-select">
              <option value="10">10</option>
              <option value="20" selected>20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div class="pagination-stepper pagination-shell__stepper">
            <button
              type="button"
              id="soldPaginationPrev"
              class="pagination-shell__prev"
              data-pagination="prev"
              aria-controls="soldList"
              aria-label="Previous page"
            >
              Prev
            </button>
            <div
              class="inventory-pagination__pages pagination-shell__pages"
              data-pagination-pages
              role="group"
              aria-label="Page selection"
              hidden
            ></div>
            <button
              type="button"
              id="soldPaginationNext"
              class="pagination-shell__next"
              data-pagination="next"
              aria-controls="soldList"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div id="soldList"></div>
    </details>
  `;
  }
  const availablePanel = document.getElementById('availableBooksPanel');
  if (availablePanel) {
    availablePanel.scrollIntoView = onScrollIntoView;
  }
  return {
    availablePanel,
    availableSearchInput: document.getElementById('availableSearchInput'),
    availList: document.getElementById('availList'),
    soldPanel: document.getElementById('soldBooksPanel'),
    soldList: document.getElementById('soldList'),
    soldPagination: document.querySelector('[data-sold-pagination]'),
    soldSummary: document.getElementById('soldPaginationSummary'),
    soldPrevButton: document.getElementById('soldPaginationPrev'),
    soldNextButton: document.getElementById('soldPaginationNext'),
    soldPageSizeSelect: document.getElementById('soldPageSize'),
    searchStatus: document.getElementById('availableSearchStatus'),
    pageSizeSelect: document.getElementById('availablePageSize'),
    topPrevButton: document.getElementById('availablePaginationPrevTop'),
    topNextButton: document.getElementById('availablePaginationNextTop'),
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
