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
  };

  const { initSaleLineItems } = await import(moduleUrl.href);
  const api = initSaleLineItems(
    {
      draftForm: dom.draftForm,
      selectedBookSummary: dom.selectedBookSummary,
      bookIdInput: dom.bookIdInput,
      priceInput: dom.priceInput,
      addLineBtn: dom.addLineBtn,
      msgEl: dom.msgEl,
      lineItemsBody: dom.lineItemsBody,
      totalsCountEl: dom.totalsCountEl,
      totalsAmountEl: dom.totalsAmountEl,
    },
    deps
  );

  return {
    api,
    lookup,
    onLinesChange: deps.onLinesChange,
    selectedBookSummary: dom.selectedBookSummary,
    bookIdInput: dom.bookIdInput,
    priceInput: dom.priceInput,
    addLineBtn: dom.addLineBtn,
    msgEl: dom.msgEl,
    lineItemsBody: dom.lineItemsBody,
    totalsCountEl: dom.totalsCountEl,
    totalsAmountEl: dom.totalsAmountEl,
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
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section id="saleLineItemsSection">
      <form id="saleLineDraftForm">
        <input type="hidden" id="saleLineBookId" name="bookId" value="">
        <p id="saleLineBookSummary" data-empty="true">No book selected</p>
        <label>
          <span>Selling price</span>
          <input id="saleLinePrice" name="sellingPrice" type="text" autocomplete="off" />
        </label>
        <button type="submit" id="saleLineAddBtn" disabled>Add line</button>
        <p id="saleLineMsg"></p>
      </form>
      <table>
        <tbody id="saleLineItemsBody"></tbody>
      </table>
      <div id="saleLineTotals">
        <span id="saleLineTotalsCount">0 lines</span>
        <span id="saleLineTotalsAmount">₹0.00</span>
      </div>
    </section>
  `;

  return {
    draftForm: document.getElementById('saleLineDraftForm'),
    selectedBookSummary: document.getElementById('saleLineBookSummary'),
    bookIdInput: document.getElementById('saleLineBookId'),
    priceInput: document.getElementById('saleLinePrice'),
    addLineBtn: document.getElementById('saleLineAddBtn'),
    msgEl: document.getElementById('saleLineMsg'),
    lineItemsBody: document.getElementById('saleLineItemsBody'),
    totalsCountEl: document.getElementById('saleLineTotalsCount'),
    totalsAmountEl: document.getElementById('saleLineTotalsAmount'),
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
