import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/salesPersist.js', import.meta.url);

export async function createSalesPersistHarness(options = {}) {
  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();

  let headerPayload = options.headerPayload ?? null;
  let lineItems = Array.isArray(options.lineItems) ? options.lineItems : [];

  const getHeaderPayload = jest.fn(() => headerPayload);
  const getLineItems = jest.fn(() => [...lineItems]);
  const collection = jest.fn((dbRef, name) => ({ dbRef, name }));
  const addDoc = jest.fn(async (...args) => {
    if (typeof options.addDocImpl === 'function') {
      return options.addDocImpl(...args);
    }
    return { id: 'sale-1' };
  });

  const module = await import(moduleUrl.href);
  const api =
    module.initSalePersist(
      {
        submitBtn: dom.submitBtn,
        msgEl: dom.msgEl,
        lineStatusList: dom.lineStatusList,
      },
      {
        db: options.db || {},
        collection: options.collection || collection,
        addDoc: options.addDocMock || addDoc,
        serverTimestamp: options.serverTimestamp || (() => 'ts'),
        getHeaderPayload,
        getLineItems,
        formatCurrency:
          options.formatCurrency || ((value) => `₹${Number(value || 0).toFixed(2)}`),
        onPersisted: options.onPersisted || jest.fn(),
      }
    ) || null;

  async function submit() {
    fireEvent.click(dom.submitBtn);
    await Promise.resolve();
    await Promise.resolve();
  }

  return {
    api,
    submitBtn: dom.submitBtn,
    msgEl: dom.msgEl,
    lineStatusList: dom.lineStatusList,
    getHeaderPayload,
    getLineItems,
    collection,
    addDoc: options.addDocMock || addDoc,
    setHeaderPayload(payload) {
      headerPayload = payload;
    },
    setLineItems(items) {
      lineItems = Array.isArray(items) ? items : [];
    },
    async submit() {
      await submit();
    },
    clickSubmit() {
      fireEvent.click(dom.submitBtn);
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section id="salePersistPanel">
      <button id="persistSaleBtn" type="button">Save sale</button>
      <p id="persistSaleMsg" class="muted"></p>
      <ul id="saleLineStatusList"></ul>
    </section>
  `;
  return {
    submitBtn: document.getElementById('persistSaleBtn'),
    msgEl: document.getElementById('persistSaleMsg'),
    lineStatusList: document.getElementById('saleLineStatusList'),
  };
}
