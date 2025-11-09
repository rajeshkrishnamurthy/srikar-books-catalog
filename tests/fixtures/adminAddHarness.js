import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const inventoryModuleUrl = new URL('../../scripts/admin/inventory.js', import.meta.url);

export async function createAdminAddHarness(options = {}) {
  const { formDefaults = {}, firebaseOverrides = {} } = options;

  jest.resetModules();
  jest.clearAllMocks();

  if (!global.confirm) {
    global.confirm = jest.fn(() => true);
  }

  const firebase = buildFirebaseMocks(firebaseOverrides);
  globalThis.__firebaseMocks = firebase;

  const { initInventory } = await import(inventoryModuleUrl.href);

  const dom = buildDom();
  const formState = createFormState(formDefaults);
  const FormDataMock = jest.fn(() => snapshotFormData(formState));
  global.FormData = FormDataMock;

  const inventoryApi = initInventory({
    addForm: dom.addForm,
    addMsg: dom.addMsg,
    availList: dom.availList,
    soldList: dom.soldList,
    supplierSelect: dom.supplierSelect,
  });

  inventoryApi.setSuppliers([
    { id: 'sup-default', name: 'Default Supplier', location: 'Chennai' },
  ]);

  return {
    mocks: firebase.mocks,
    addMsg: dom.addMsg,
    addForm: dom.addForm,
    inventoryApi,
    setField(name, value) {
      formState.single[name] = value;
    },
    setFileList(name, files) {
      formState.multi[name] = files;
    },
    setSuppliers(list = []) {
      inventoryApi?.setSuppliers(list);
    },
    async submitAddForm() {
      fireEvent.submit(dom.addForm);
      await flushPromises();
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <form id="addForm">
      <select id="supplierSelect" name="supplierId">
        <option value="" selected disabled>Select supplier *</option>
      </select>
    </form>
    <p id="addMsg"></p>
    <div id="availList"></div>
    <div id="soldList"></div>
  `;
  const addForm = document.getElementById('addForm');
  addForm.reset = jest.fn();
  return {
    addForm,
    addMsg: document.getElementById('addMsg'),
    availList: document.getElementById('availList'),
    soldList: document.getElementById('soldList'),
    supplierSelect: document.getElementById('supplierSelect'),
  };
}

function createFormState(overrides = {}) {
  const baseSingle = {
    title: 'Test title',
    author: 'Test Author',
    category: 'Fiction',
    binding: 'Paperback',
    price: '299',
    mrp: '499',
    isbn: '9781234567890',
    condition: 'Good as new',
    description: 'Gently used copy',
    featured: null,
    purchasePrice: '',
    supplierId: 'sup-default',
    cover: createFileStub('cover.jpg'),
  };
  const baseMulti = {
    more: [],
  };
  return {
    single: { ...baseSingle, ...(overrides.single || {}) },
    multi: { ...baseMulti, ...(overrides.multi || {}) },
  };
}

function snapshotFormData(state) {
  const singleSnapshot = { ...state.single };
  const multiSnapshot = Object.fromEntries(
    Object.entries(state.multi).map(([key, list]) => [key, [...list]])
  );
  return {
    get(key) {
      return Object.prototype.hasOwnProperty.call(singleSnapshot, key)
        ? singleSnapshot[key]
        : null;
    },
    getAll(key) {
      return multiSnapshot[key] ? [...multiSnapshot[key]] : [];
    },
  };
}

function createFileStub(name, size = 42) {
  return { name, size, type: 'image/jpeg' };
}

function buildFirebaseMocks(overrides = {}) {
  const collection = jest.fn(() => ({ type: 'collection' }));
  const addDoc = jest.fn().mockResolvedValue({ id: 'book-1' });
  const setDoc = jest.fn().mockResolvedValue();
  const updateDoc = jest.fn().mockResolvedValue();
  const docRef = jest.fn(() => ({ type: 'doc' }));
  const getDoc = jest
    .fn()
    .mockResolvedValue({ data: () => ({ images: [], imagePaths: [] }) });
  const deleteDoc = jest.fn().mockResolvedValue();
  const deleteObject = jest.fn().mockResolvedValue();
  const ref = jest.fn(() => ({ type: 'ref' }));
  const uploadBytes = jest.fn().mockResolvedValue();
  const getDownloadURL = jest.fn().mockResolvedValue('https://example/cover');
  const serverTimestamp = jest.fn(() => 'ts');
  const storage = {};
  const db = {};

  const where = jest.fn(() => ({}));
  const orderBy = jest.fn(() => ({}));
  const query = jest.fn(() => ({}));
  const onSnapshot = jest.fn((q, cb) => {
    cb({ docs: [] });
    return () => {};
  });

  const exports = {
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

  return {
    exports: { ...exports, ...overrides },
    mocks: {
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
    },
  };
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
