import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/bundles.js', import.meta.url);

export async function createBundleHarness(options = {}) {
  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const firebase = buildFirebaseMocks(options.firebaseOverrides);
  const lookup = buildLookupFactory();
  const now = typeof options.now === 'function' ? options.now : () => new Date('2024-01-02T10:00:00Z');
  const auth = options.auth || { currentUser: { uid: 'admin-1', email: 'admin@example.com' } };

  globalThis.__firebaseMocks = firebase;

  const { initBundleCreator } = await import(moduleUrl.href);
  const api = initBundleCreator(
    {
      form: dom.form,
      titleInput: dom.titleInput,
      supplierSelect: dom.supplierSelect,
      selectedBooksList: dom.selectedBooksList,
      priceInput: dom.priceInput,
      priceMsg: dom.priceMsg,
      msgEl: dom.msgEl,
      submitBtn: dom.submitBtn,
      resetBtn: dom.resetBtn,
      recommendedHint: dom.recommendedHint,
    },
    {
      firebase: firebase.exports,
      auth,
      createBookLookup: lookup.factory,
      now,
    }
  );

  return {
    api,
    form: dom.form,
    msgEl: dom.msgEl,
    priceMsg: dom.priceMsg,
    submitBtn: dom.submitBtn,
    resetBtn: dom.resetBtn,
    recommendedHint: dom.recommendedHint,
    lookupMock: lookup.factory,
    mocks: firebase.mocks,
    setSupplierOptions(optionsList = []) {
      if (typeof api.setSuppliers === 'function') {
        api.setSuppliers(optionsList);
      } else {
        const opts = [`<option value=\"\">Choose supplier</option>`].concat(
          optionsList.map(
            (sup) =>
              `<option value=\"${sup.id}\">${sup.name}${sup.location ? ` — ${sup.location}` : ''}</option>`
          )
        );
        dom.supplierSelect.innerHTML = opts.join('');
      }
    },
    isSupplierLocked() {
      return dom.supplierSelect.disabled;
    },
    setSupplier(id) {
      if (dom.supplierSelect.disabled && dom.supplierSelect.value) {
        throw new Error('Supplier selection is locked. Reset bundle to change supplier.');
      }
      dom.supplierSelect.value = id;
      fireEvent.change(dom.supplierSelect);
    },
    setTitle(value) {
      dom.titleInput.value = value;
      dom.titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    },
    setPrice(value) {
      dom.priceInput.value = value;
      dom.priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    },
    emitBookSelection(book) {
      lookup.emitSelection(book);
    },
    selectedBookIds() {
      return Array.from(dom.selectedBooksList.querySelectorAll('li')).map((li) => li.dataset.bookId);
    },
    selectedBookCount() {
      return this.selectedBookIds().length;
    },
    clickReset() {
      dom.resetBtn.click();
    },
    priceValue() {
      return dom.priceInput.value;
    },
    priceError() {
      return dom.priceMsg.textContent.trim();
    },
    globalMessage() {
      return dom.msgEl.textContent.trim();
    },
    submitDisabled() {
      return dom.submitBtn.disabled;
    },
    latestLookupConfig() {
      return lookup.latestConfig();
    },
    async submit() {
      fireEvent.submit(dom.form);
      await flushPromises();
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section>
      <form id="bundleForm">
        <label>
          Bundle title
          <input id="bundleTitleInput" />
        </label>
        <label>
          Supplier
          <select id="bundleSupplierSelect">
            <option value="">Choose supplier</option>
          </select>
        </label>
        <ul id="bundleSelectedBooks" aria-live="polite"></ul>
        <p id="bundleRecommendedHint" class="muted"></p>
        <label>
          Bundle price
          <input id="bundlePriceInput" />
        </label>
        <p id="bundlePriceMsg" role="alert"></p>
        <div class="bundle-actions">
          <button id="bundleSubmitBtn" type="submit" disabled>Create bundle</button>
          <button id="bundleResetBtn" type="reset">Reset bundle</button>
        </div>
      </form>
      <p id="bundleMsg"></p>
    </section>
  `;

  return {
    form: document.getElementById('bundleForm'),
    titleInput: document.getElementById('bundleTitleInput'),
    supplierSelect: document.getElementById('bundleSupplierSelect'),
    selectedBooksList: document.getElementById('bundleSelectedBooks'),
    recommendedHint: document.getElementById('bundleRecommendedHint'),
    priceInput: document.getElementById('bundlePriceInput'),
    priceMsg: document.getElementById('bundlePriceMsg'),
    submitBtn: document.getElementById('bundleSubmitBtn'),
    resetBtn: document.getElementById('bundleResetBtn'),
    msgEl: document.getElementById('bundleMsg'),
  };
}

function buildFirebaseMocks(overrides = {}) {
  const collection = jest.fn((db, path) => ({ path, type: 'collection' }));
  const addDoc = jest.fn().mockResolvedValue({ id: 'bundle-1' });
  const serverTimestamp = jest.fn(() => 'ts');

  const exports = {
    db: {},
    collection,
    addDoc,
    serverTimestamp,
  };

  Object.assign(exports, overrides);

  return {
    exports,
    mocks: {
      collection,
      addDoc,
      serverTimestamp,
    },
  };
}

function buildLookupFactory() {
  const instances = [];
  const factory = jest.fn((config = {}) => {
    instances.push({ config });
    return {
      dispose: jest.fn(),
    };
  });

  return {
    factory,
    emitSelection(book) {
      const latest = instances[instances.length - 1];
      latest?.config?.onSelect?.(book);
    },
    latestConfig() {
      const latest = instances[instances.length - 1];
      return latest?.config || null;
    },
  };
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
