import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/customers.js', import.meta.url);

export async function createAdminCustomerHarness(options = {}) {
  const { firebaseOverrides = {} } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const firebase = buildFirebaseMocks(firebaseOverrides);
  globalThis.__firebaseMocks = firebase;

  const { initCustomerMaster } = await import(moduleUrl.href);

  initCustomerMaster(
    {
      form: dom.form,
      nameInput: dom.nameInput,
      addressInput: dom.addressInput,
      locationInput: dom.locationInput,
      whatsAppInput: dom.whatsAppInput,
      msgEl: dom.msgEl,
      listEl: dom.listEl,
    },
    firebase.exports
  );

  return {
    form: dom.form,
    msgEl: dom.msgEl,
    listEl: dom.listEl,
    get listItems() {
      return Array.from(dom.listEl.querySelectorAll('li'));
    },
    setField(name, value) {
      const fieldMap = {
        customerName: dom.nameInput,
        customerAddress: dom.addressInput,
        customerLocation: dom.locationInput,
        customerWhatsApp: dom.whatsAppInput,
      };
      if (fieldMap[name]) {
        fieldMap[name].value = value;
      }
    },
    async submit() {
      fireEvent.submit(dom.form);
      await flushPromises();
    },
    emitCustomers(customers = []) {
      const cb = firebase.listeners.customers;
      if (!cb) return;
      cb({
        docs: customers.map((data, idx) => ({
          id: data.id || `cust-${idx}`,
          data: () => data,
        })),
      });
    },
    mocks: firebase.mocks,
    listeners: firebase.listeners,
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section>
      <form id="customerForm">
        <input id="customerNameInput" name="customerName" />
        <textarea id="customerAddressInput" name="customerAddress"></textarea>
        <input id="customerLocationInput" name="customerLocation" />
        <input id="customerWhatsAppInput" name="customerWhatsApp" />
        <button type="submit">Save customer</button>
      </form>
      <p id="customerMsg"></p>
      <ul id="customerList"></ul>
    </section>
  `;

  const form = document.getElementById('customerForm');
  return {
    form,
    nameInput: document.getElementById('customerNameInput'),
    addressInput: document.getElementById('customerAddressInput'),
    locationInput: document.getElementById('customerLocationInput'),
    whatsAppInput: document.getElementById('customerWhatsAppInput'),
    msgEl: document.getElementById('customerMsg'),
    listEl: document.getElementById('customerList'),
  };
}

function buildFirebaseMocks(overrides = {}) {
  const listeners = { customers: null };

  const collection = jest.fn((db, path) => ({ type: 'collection', path }));
  const addDoc = jest.fn().mockResolvedValue({ id: 'cust-1' });
  const doc = jest.fn((db, path, id) => ({ type: 'doc', path, id }));
  const updateDoc = jest.fn().mockResolvedValue();
  const query = jest.fn((ref, ...constraints) => ({
    type: 'query',
    ref,
    constraints,
  }));
  const where = jest.fn((field, op, value) => ({
    type: 'where',
    field,
    op,
    value,
  }));
  const orderBy = jest.fn((field) => ({ type: 'orderBy', field }));
  const getDocs = jest.fn().mockResolvedValue({ docs: [], empty: true });
  const onSnapshot = jest.fn((ref, cb) => {
    listeners.customers = cb;
    cb({ docs: [] });
    return () => {};
  });
  const serverTimestamp = jest.fn(() => 'ts');

  const exports = {
    db: {},
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    serverTimestamp,
  };

  Object.assign(exports, overrides);

  return {
    exports,
    listeners,
    mocks: {
      collection: exports.collection,
      addDoc: exports.addDoc,
      updateDoc: exports.updateDoc,
      doc: exports.doc,
      query: exports.query,
      where: exports.where,
      orderBy: exports.orderBy,
      onSnapshot: exports.onSnapshot,
      getDocs: exports.getDocs,
      serverTimestamp: exports.serverTimestamp,
    },
  };
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
