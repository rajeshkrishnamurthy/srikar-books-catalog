import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/salesLineItems.js', import.meta.url);

export async function createSalesLineItemsHarness(options = {}) {
  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const lookup = buildLookup(options.lookupOverrides);

  const deps = {
    lookup,
    onLinesChange: options.onLinesChange || jest.fn(),
    formatCurrency: options.formatCurrency || ((amount) => `₹${Number(amount || 0).toFixed(2)}`),
    buildLineId:
      options.buildLineId || (() => `line-${Math.random().toString(36).slice(2,10)}`),
    serverTimestamp: options.serverTimestamp || (() => new Date()),
    headerState: options.headerState || null,
  };

  const { initSaleLineItems } = await import(moduleUrl.href);
  const api = initSaleLineItems(
    {
      draftForm: dom.draftForm,
      draftLabelEl: dom.draftLabelEl,
      supplierSelect: dom.supplierSelect,
      bookTitleInput: dom.bookTitleInput,
      selectedBookSummary: dom.selectedBookSummary,
      bookIdInput: dom.bookIdInput,
      priceInput: dom.priceInput,
      addLineBtn: dom.addLineBtn,
      msgEl: dom.msgEl,
      removalStatusEl: dom.removalStatusEl,
      lineItemsBody: dom.lineItemsBody,
      totalsCountEl: dom.totalsCountEl,
      totalsAmountEl: dom.totalsAmountEl,
      statusList: dom.statusList,
      persistBtn: dom.persistBtn,
      persistMsg: dom.persistMsg,
    },
    deps
  );

  return {
    api,
    lookup,
    onLinesChange: deps.onLinesChange,
    draftForm: dom.draftForm,
    draftLabelEl: dom.draftLabelEl,
    supplierSelect: dom.supplierSelect,
    bookTitleInput: dom.bookTitleInput,
    suggestionsList: dom.suggestionsList,
    selectedBookSummary: dom.selectedBookSummary,
    bookIdInput: dom.bookIdInput,
    priceInput: dom.priceInput,
    addLineBtn: dom.addLineBtn,
    msgEl: dom.msgEl,
    removalStatusEl: dom.removalStatusEl,
    lineItemsBody: dom.lineItemsBody,
    totalsCountEl: dom.totalsCountEl,
    totalsAmountEl: dom.totalsAmountEl,
    statusList: dom.statusList,
    persistBtn: dom.persistBtn,
    persistMsg: dom.persistMsg,
    selectBook(book) {
      lookup.emitSelection(book);
    },
    typePrice(value) {
      dom.priceInput.value = value;
      fireEvent.input(dom.priceInput);
    },
    submitLine() {
      fireEvent.submit(dom.draftForm);
    },
    clickAdd() {
      fireEvent.click(dom.addLineBtn);
    },
    setSupplierOptions(options = []) {
      api?.setSuppliers?.(options);
    },
    selectSupplier(value) {
      dom.supplierSelect.value = value;
      fireEvent.change(dom.supplierSelect);
    },
    clearSupplierSelection() {
      dom.supplierSelect.value = '';
      fireEvent.change(dom.supplierSelect);
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section id="saleLineItemsSection">
      <form id="saleLineDraftForm">
        <label id="saleLineDraftLabel" for="saleLineBookTitle">Add another book</label>
        <input
          id="saleLineBookTitle"
          name="saleLineBookTitle"
          type="text"
          placeholder="Start typing a title"
          autocomplete="off"
        />
        <ul id="saleLineBookSuggestions" role="listbox" aria-label="Matching titles"></ul>
        <label>
          <span>Selling price</span>
          <input id="saleLinePrice" name="sellingPrice" type="text" autocomplete="off" />
        </label>
        <label>
          Supplier
          <select id="saleLineSupplierSelect" name="supplierId">
            <option value="" selected disabled>Select supplier *</option>
          </select>
        </label>
        <input type="hidden" id="saleLineBookId" name="bookId" value="">
        <p id="saleLineBookSummary" class="sr-only" data-empty="true">No book selected</p>
        <button type="submit" id="saleLineAddBtn" class="btn btn-ghost sale-line-submit" disabled>Submit</button>
        <p id="saleLineMsg"></p>
      </form>
      <table>
        <tbody id="saleLineItemsBody"></tbody>
      </table>
      <div id="saleLineTotals">
        <span id="saleLineTotalsCount">0 lines</span>
        <span id="saleLineTotalsAmount">₹0.00</span>
      </div>
      <p id="saleLineRemovalStatus" aria-live="polite" class="sr-only"></p>
      <div class="persist-controls">
        <button id="salePersistBtn" type="button">Persist sale</button>
        <p id="salePersistMsg" class="muted" aria-live="polite"></p>
      </div>
      <ul id="saleLineStatusList" class="stack"></ul>
    </section>
  `;

  return {
    draftForm: document.getElementById('saleLineDraftForm'),
    draftLabelEl: document.getElementById('saleLineDraftLabel'),
    supplierSelect: document.getElementById('saleLineSupplierSelect'),
    bookTitleInput: document.getElementById('saleLineBookTitle'),
    suggestionsList: document.getElementById('saleLineBookSuggestions'),
    selectedBookSummary: document.getElementById('saleLineBookSummary'),
    bookIdInput: document.getElementById('saleLineBookId'),
    priceInput: document.getElementById('saleLinePrice'),
    addLineBtn: document.getElementById('saleLineAddBtn'),
    msgEl: document.getElementById('saleLineMsg'),
    removalStatusEl: document.getElementById('saleLineRemovalStatus'),
    lineItemsBody: document.getElementById('saleLineItemsBody'),
    totalsCountEl: document.getElementById('saleLineTotalsCount'),
    totalsAmountEl: document.getElementById('saleLineTotalsAmount'),
    statusList: document.getElementById('saleLineStatusList'),
    persistBtn: document.getElementById('salePersistBtn'),
    persistMsg: document.getElementById('salePersistMsg'),
  };
}

function buildLookup(overrides = {}) {
  let handler = () => {};
  const api = {
    onSelect: jest.fn((cb) => {
      handler = typeof cb === 'function' ? cb : () => {};
      return () => {
        handler = () => {};
      };
    }),
    emitSelection(book) {
      handler(book);
    },
  };
  return {
    ...api,
    ...overrides,
  };
}
