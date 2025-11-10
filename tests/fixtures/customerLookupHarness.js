import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/customerLookup.js', import.meta.url);

export async function createCustomerLookupHarness(options = {}) {
  const { firebaseOverrides = {}, onSelect = jest.fn() } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const firebase = buildFirebaseMocks(firebaseOverrides);
  globalThis.__firebaseMocks = firebase;

  const { initCustomerLookup } = await import(moduleUrl.href);

  initCustomerLookup(
    {
      searchInput: dom.searchInput,
      listEl: dom.listEl,
      emptyEl: dom.emptyEl,
      clearBtn: dom.clearBtn,
    },
    {
      onSelect,
    },
    firebase.exports
  );

  return {
    searchInput: dom.searchInput,
    listEl: dom.listEl,
    emptyEl: dom.emptyEl,
    clearBtn: dom.clearBtn,
    onSelect,
    mocks: firebase.mocks,
    search(value) {
      dom.searchInput.value = value;
      fireEvent.input(dom.searchInput);
    },
    clickClear() {
      dom.clearBtn.click();
    },
    emitResults(customers = []) {
      const cb = firebase.listeners.lookup;
      if (cb) {
        cb({
          docs: customers.map((data, idx) => ({
            id: data.id || `cust-${idx}`,
            data: () => data,
          })),
        });
      }
    },
    get rows() {
      return Array.from(dom.listEl.querySelectorAll('li'));
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section>
      <div id="customerLookup">
        <label>
          <span class="sr-only">Search customers</span>
          <input id="customerLookupSearch" type="search" placeholder="Search customer" />
        </label>
        <button type="button" id="customerLookupClear">Clear</button>
        <p id="customerLookupEmpty">Start typing to search customers.</p>
        <ul id="customerLookupList"></ul>
      </div>
    </section>
  `;

  return {
    searchInput: document.getElementById('customerLookupSearch'),
    clearBtn: document.getElementById('customerLookupClear'),
    emptyEl: document.getElementById('customerLookupEmpty'),
    listEl: document.getElementById('customerLookupList'),
  };
}

function buildFirebaseMocks(overrides = {}) {
  const listeners = { lookup: null };

  const collection = jest.fn((db, path) => ({ type: 'collection', path }));
  const query = jest.fn((ref, ...constraints) => ({ type: 'query', ref, constraints }));
  const where = jest.fn((field, op, value) => ({ type: 'where', field, op, value }));
  const orderBy = jest.fn((field) => ({ type: 'orderBy', field }));
  const limit = jest.fn((count) => ({ type: 'limit', count }));
  const getDocs = jest.fn().mockResolvedValue({ docs: [], empty: true });
  const onSnapshot = jest.fn((ref, cb) => {
    listeners.lookup = cb;
    cb({ docs: [] });
    return () => {};
  });

  const exports = {
    db: {},
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
  };

  Object.assign(exports, overrides);

  return {
    exports,
    listeners,
    mocks: {
      collection: exports.collection,
      query: exports.query,
      where: exports.where,
      orderBy: exports.orderBy,
      limit: exports.limit,
      getDocs: exports.getDocs,
      onSnapshot: exports.onSnapshot,
    },
  };
}
