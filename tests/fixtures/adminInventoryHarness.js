import { jest } from '@jest/globals';

const inventoryModuleUrl = new URL('../../scripts/admin/inventory.js', import.meta.url);

export async function createAdminInventoryHarness(options = {}) {
  const { firebaseOverrides = {} } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const firebase = buildFirebaseMocks(firebaseOverrides);
  globalThis.__firebaseMocks = firebase;

  const { initInventory } = await import(inventoryModuleUrl.href);
  const inventoryApi = initInventory({
    addForm: null,
    addMsg: null,
    availList: dom.availList,
    soldList: dom.soldList,
  });

  return {
    availList: dom.availList,
    soldList: dom.soldList,
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

function buildDom() {
  document.body.innerHTML = `
    <div id="availList"></div>
    <div id="soldList"></div>
  `;
  return {
    availList: document.getElementById('availList'),
    soldList: document.getElementById('soldList'),
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
