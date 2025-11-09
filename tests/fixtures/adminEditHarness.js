import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const editorModuleUrl = new URL('../../scripts/admin/editor.js', import.meta.url);

export async function createAdminEditHarness(options = {}) {
  const { firebaseOverrides = {} } = options;

  jest.resetModules();
  jest.clearAllMocks();

  ensureGlobalStubs();

  const firebase = buildFirebaseMocks(firebaseOverrides);
  globalThis.__firebaseMocks = firebase;

  const dom = buildDom();
  const { initEditor } = await import(editorModuleUrl.href);
  const editor = initEditor();
  editor.setSuppliers?.([{ id: 'sup-default', name: 'Default Supplier' }]);
  const defaultSelect = dom.supplierSelect;
  if (defaultSelect) defaultSelect.value = 'sup-default';

  return {
    open: (id = 'book-1', data = null) => editor.open(id, data),
    form: dom.form,
    dialog: dom.dialog,
    purchaseInput: dom.purchaseInput,
    supplierSelect: dom.supplierSelect,
    msgEl: dom.msgEl,
    mocks: firebase.mocks,
    async submit() {
      fireEvent.submit(dom.form);
      await flushPromises();
    },
    setField(name, value) {
      const el = dom.form.elements[name];
      if (el) el.value = value;
    },
    setSupplierOptions(list = []) {
      editor.setSuppliers?.(list);
      if (dom.supplierSelect && list[0]) {
        dom.supplierSelect.value = list[0].id;
      }
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <dialog id="editDialog">
      <form id="editForm" method="dialog">
        <input name="id" />
        <input name="etitle" />
        <input name="eauthor" />
        <select name="ecategory">
          <option value="Fiction">Fiction</option>
        </select>
        <select name="ebinding">
          <option value="Paperback">Paperback</option>
        </select>
        <input name="eprice" />
        <input name="emrp" />
        <input name="epurchasePrice" />
        <select name="esupplierId">
          <option value="">Select supplier *</option>
        </select>
        <input name="eisbn" />
        <select name="econdition">
          <option value="Good as new">Good as new</option>
        </select>
        <textarea name="edescription"></textarea>
        <div id="editCoverPreview"></div>
        <input id="editCoverInput" type="file" />
        <input id="editMoreInput" type="file" multiple />
        <button id="editCancelBtn" type="button"></button>
        <p id="editMsg"></p>
      </form>
    </dialog>
  `;

  const dialog = document.getElementById('editDialog');
  dialog.showModal = jest.fn();
  dialog.close = jest.fn();

  const form = document.getElementById('editForm');
  const purchaseInput = form.elements['epurchasePrice'];
  purchaseInput.placeholder = 'Purchase price (our cost)';
  purchaseInput.inputMode = 'numeric';

  const coverInput = document.getElementById('editCoverInput');
  Object.defineProperty(coverInput, 'files', {
    configurable: true,
    writable: true,
    value: [],
  });

  const moreInput = document.getElementById('editMoreInput');
  Object.defineProperty(moreInput, 'files', {
    configurable: true,
    writable: true,
    value: [],
  });

  return {
    dialog,
    form,
    purchaseInput,
    supplierSelect: form.elements['esupplierId'],
    msgEl: document.getElementById('editMsg'),
  };
}

function buildFirebaseMocks(overrides = {}) {
  const collection = jest.fn(() => ({}));
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
  const onSnapshot = jest.fn(() => () => {});

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

  Object.entries(overrides).forEach(([key, value]) => {
    exports[key] = value;
  });

  return {
    exports,
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

function ensureGlobalStubs() {
  if (!global.URL) {
    global.URL = {};
  }
  if (!global.URL.createObjectURL) {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
  }
  if (!global.URL.revokeObjectURL) {
    global.URL.revokeObjectURL = jest.fn();
  }
  if (typeof Image === 'undefined') {
    global.Image = class {
      constructor() {
        this.style = {};
      }
      set src(val) {
        this._src = val;
        if (typeof this.onload === 'function') {
          this.onload();
        }
      }
      get src() {
        return this._src;
      }
    };
  }
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
