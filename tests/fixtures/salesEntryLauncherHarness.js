import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/salesEntryLauncher.js', import.meta.url);

export async function createSalesEntryLauncherHarness(options = {}) {
  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const deps = {
    startSaleWorkflow: options.startSaleWorkflow || jest.fn(),
  };

  const { initSaleEntryLauncher } = await import(moduleUrl.href);
  const api =
    initSaleEntryLauncher(
      {
        button: dom.recordSaleBtn,
        searchInput: dom.adminSearch,
        panel: dom.saleEntryPanel,
        focusTarget: dom.saleHeaderSaleDate,
      },
      deps
    ) || {};

  return {
    ...dom,
    api,
    deps,
    clickRecordSale() {
      fireEvent.click(dom.recordSaleBtn);
    },
    pressRecordSaleEnter() {
      fireEvent.keyDown(dom.recordSaleBtn, { key: 'Enter' });
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <header>
      <div class="flex" id="inventoryHeaderActions">
        <input id="adminSearch" type="search" />
        <button id="recordSaleBtn" class="btn">Record sale</button>
      </div>
    </header>
    <details id="saleEntryPanel">
      <summary>Record a sale</summary>
      <form id="saleHeaderForm">
        <input id="saleHeaderSaleDate" type="text" />
      </form>
    </details>
  `;

  const recordSaleBtn = document.getElementById('recordSaleBtn');
  recordSaleBtn.focus = recordSaleBtn.focus || (() => {});

  const saleEntryPanel = document.getElementById('saleEntryPanel');
  saleEntryPanel.scrollIntoView = jest.fn();

  const saleHeaderSaleDate = document.getElementById('saleHeaderSaleDate');
  saleHeaderSaleDate.focus = jest.fn();

  return {
    recordSaleBtn,
    adminSearch: document.getElementById('adminSearch'),
    saleEntryPanel,
    saleHeaderSaleDate,
  };
}
