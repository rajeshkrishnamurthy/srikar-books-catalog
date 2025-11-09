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
      idInput: dom.idInput,
      cancelBtn: dom.cancelBtn,
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
    async clickListButton(index, action) {
      const item = dom.listEl.querySelectorAll('li')[index];
      const btn = item?.querySelector(`button[data-action="${action}"]`);
      if (btn) {
        btn.click();
      }
      await flushPromises();
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
        <input id="supplierIdInput" name="supplierId" type="hidden" />
        <button type="submit">Save supplier</button>
        <button type="button" id="supplierCancelBtn">Cancel</button>
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
    idInput: document.getElementById('supplierIdInput'),
    cancelBtn: document.getElementById('supplierCancelBtn'),
    msgEl: document.getElementById('supplierMsg'),
    listEl: document.getElementById('supplierList'),
  };
}

function buildFirebaseMocks(overrides = {}) {
  const listeners = { suppliers: null };

  const collection = jest.fn((db, path) => ({ type: 'collection', path }));
  const addDoc = jest.fn().mockResolvedValue({ id: 'sup-1' });
  const orderBy = jest.fn((field) => ({ type: 'orderBy', field }));
  const where = jest.fn((field, op, value) => ({
    type: 'where',
    field,
    op,
    value,
  }));
  const query = jest.fn((ref, ...constraints) => ({
    type: 'query',
    ref,
    constraints,
  }));
  const docRef = jest.fn((db, path, id) => ({ type: 'doc', path, id }));
  const updateDoc = jest.fn().mockResolvedValue();
  const deleteDoc = jest.fn().mockResolvedValue();
  const getDocs = jest
    .fn()
    .mockImplementation(async (q) => ({ docs: [], empty: true, query: q }));
  const onSnapshot = jest.fn((ref, cb) => {
    listeners.suppliers = cb;
    cb({ docs: [] });
    return () => {};
  });

  const exports = {
    db: {},
    collection,
    doc: docRef,
    addDoc,
    updateDoc,
    deleteDoc,
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
    mocks: {
      collection,
      doc: docRef,
      addDoc,
      updateDoc,
      deleteDoc,
      orderBy,
      query,
      onSnapshot,
      where,
      getDocs,
    },
    listeners,
  };
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
