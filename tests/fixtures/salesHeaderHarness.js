import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/salesHeader.js', import.meta.url);

export async function createSalesHeaderHarness(options = {}) {
  const {
    onHeaderReady = jest.fn(),
    lookupOverrides = {},
    clock,
  } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const lookup = buildLookupApi(lookupOverrides);
  const deps = {
    lookup,
    onHeaderReady,
    serverTimestamp: jest.fn(() => 'ts'),
  };
  if (Object.prototype.hasOwnProperty.call(options, 'clock')) {
    deps.clock = clock;
  }

  const { initSaleHeader } = await import(moduleUrl.href);
  const api = initSaleHeader(
    {
      form: dom.form,
      saleDateInput: dom.saleDateInput,
      customerSummary: dom.customerSummary,
      customerIdInput: dom.customerIdInput,
      changeCustomerBtn: dom.changeCustomerBtn,
      continueBtn: dom.continueBtn,
      msgEl: dom.msgEl,
    },
    deps
  );

  return {
    api,
    form: dom.form,
    saleDateInput: dom.saleDateInput,
    customerSummary: dom.customerSummary,
    changeCustomerBtn: dom.changeCustomerBtn,
    customerIdInput: dom.customerIdInput,
    continueBtn: dom.continueBtn,
    msgEl: dom.msgEl,
    lookup,
    onHeaderReady,
    setSaleDate(value) {
      dom.saleDateInput.value = value;
      fireEvent.input(dom.saleDateInput);
    },
    submit() {
      fireEvent.submit(dom.form);
    },
    selectCustomer(customer) {
      lookup.emitSelection(customer);
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section>
      <form id="saleHeaderForm">
        <input type="hidden" id="saleCustomerId" name="customerId" />
        <div id="saleCustomerSummary" data-empty="true">
          <span id="saleCustomerSummaryText">No customer selected</span>
          <button type="button" id="saleCustomerChangeBtn" hidden>Change customer</button>
        </div>
        <button type="button" id="saleCustomerLookupBtn">Find customer</button>
        <label>
          <span class="sr-only">Sale date</span>
          <input id="saleDateInput" name="saleDate" type="text" placeholder="dd-mon-yy" />
        </label>
        <button type="submit" id="saleHeaderContinue">Continue to line items</button>
      </form>
      <p id="saleHeaderMsg"></p>
    </section>
  `;

  return {
    form: document.getElementById('saleHeaderForm'),
    saleDateInput: document.getElementById('saleDateInput'),
    customerSummary: document.getElementById('saleCustomerSummary'),
    customerSummaryText: document.getElementById('saleCustomerSummaryText'),
    changeCustomerBtn: document.getElementById('saleCustomerChangeBtn'),
    customerIdInput: document.getElementById('saleCustomerId'),
    continueBtn: document.getElementById('saleHeaderContinue'),
    msgEl: document.getElementById('saleHeaderMsg'),
  };
}

function buildLookupApi(overrides = {}) {
  let selectionHandler = () => {};
  const api = {
    onSelect: jest.fn((cb) => {
      const handler = typeof cb === 'function' ? cb : () => {};
      selectionHandler = handler;
      return () => {
        if (selectionHandler === handler) {
          selectionHandler = () => {};
        }
      };
    }),
    offSelect: jest.fn((cb) => {
      if (!cb || cb === selectionHandler) {
        selectionHandler = () => {};
      }
    }),
    emitSelection(customer) {
      selectionHandler(customer);
    },
  };
  return {
    ...api,
    ...overrides,
  };
}
