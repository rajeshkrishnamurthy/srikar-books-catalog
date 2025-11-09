import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/suppliers.js', import.meta.url);

export async function createAdminSupplierHarness(options = {}) {
  const { firebaseOverrides = {} } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const firebase = buildFirebaseMocks(firebaseOverrides);
  globalThis.__firebaseMocks = firebase;

  const { initSupplierMaster } = await import(moduleUrl.href);

  initSupplierMaster(
    {
      form: dom.form,
      nameInput: dom.nameInput,
      locationInput: dom.locationInput,
      msgEl: dom.msgEl,
      listEl: dom.listEl,
    },
    firebase.exports
  );

  return {
    form: dom.form,
    msgEl: dom.msgEl,
    listEl: dom.listEl,
    setField(name, value) {
      const map = {
        supplierName: dom.nameInput,
        supplierLocation: dom.locationInput,
      };
      if (map[name]) {
        map[name].value = value;
      }
    },
    async submit() {
      fireEvent.submit(dom.form);
      await flushPromises();
    },
    emitSuppliers(docs = []) {
      firebase.listeners.suppliers?.({
        docs: docs.map((data, idx) => ({
          id: data.id || `sup-${idx}`,
          data: () => data,
        })),
      });
    },
    mocks: firebase.mocks,
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section>
      <form id="supplierForm">
        <input id="supplierNameInput" name="supplierName" />
        <input id="supplierLocationInput" name="supplierLocation" />
        <button type="submit">Add supplier</button>
      </form>
      <p id="supplierMsg"></p>
      <ul id="supplierList"></ul>
    </section>
  `;
  const form = document.getElementById('supplierForm');
  return {
    form,
    nameInput: document.getElementById('supplierNameInput'),
    locationInput: document.getElementById('supplierLocationInput'),
    msgEl: document.getElementById('supplierMsg'),
    listEl: document.getElementById('supplierList'),
  };
}

function buildFirebaseMocks(overrides = {}) {
  const listeners = { suppliers: null };

  const collection = jest.fn(() => ({ type: 'collection' }));
  const addDoc = jest.fn().mockResolvedValue({ id: 'sup-1' });
  const orderBy = jest.fn(() => ({ type: 'orderBy' }));
  const where = jest.fn((field, op, value) => ({
    type: 'where',
    field,
    op,
    value,
  }));
  const query = jest.fn(() => ({ type: 'query' }));
  const onSnapshot = jest.fn((ref, cb) => {
    listeners.suppliers = cb;
    cb({ docs: [] });
    return () => {};
  });
  const getDocs = jest.fn(async () => ({ docs: [], empty: true }));

  const exports = {
    db: {},
    collection,
    addDoc,
    orderBy,
    query,
    onSnapshot,
    where,
    getDocs,
    serverTimestamp: jest.fn(() => 'ts'),
  };

  Object.assign(exports, overrides);

  return {
    exports,
    mocks: { collection, addDoc, orderBy, query, onSnapshot, where, getDocs },
    listeners,
  };
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
