import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/bundleList.js', import.meta.url);

export async function createAdminBundleListHarness(options = {}) {
  const {
    bundles = defaultBundles(),
    suppliers = defaultSuppliers(),
    hydrateBundleBooks = jest.fn(async () => []),
  } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const lookup = buildLookupFactory();

  const loadBundles = jest.fn().mockResolvedValue(bundles);
  const loadSuppliers = jest.fn().mockResolvedValue(suppliers);

  const { initBundleList } = await import(moduleUrl.href);

  const api = initBundleList(
    {
      searchInput: dom.searchInput,
      searchHiddenInput: dom.searchHiddenInput,
      supplierSelect: dom.supplierSelect,
      statusSelect: dom.statusSelect,
      resultsEl: dom.results,
      emptyEl: dom.empty,
      suggestionsEl: dom.suggestions,
      searchMsg: dom.searchMsg,
      summaryEl: dom.summary,
    },
    {
      loadBundles,
      loadSuppliers,
      renderPublishControls: (bundle) => renderToggleMarkup(bundle),
      createBookLookup: lookup.factory,
      hydrateBundleBooks,
    }
  );

  return {
    ...dom,
    api,
    lookup,
    mocks: {
      loadBundles,
      loadSuppliers,
      hydrateBundleBooks,
    },
    async search(term) {
      dom.searchInput.value = term;
      fireEvent.input(dom.searchInput);
      await flushPromises();
    },
    async selectBook(book) {
      lookup.emitSelection(book);
      await flushPromises();
    },
    async clearSelectedBook() {
      lookup.emitSelection(null);
      await flushPromises();
    },
    async filterSupplier(id) {
      dom.supplierSelect.value = id;
      fireEvent.change(dom.supplierSelect);
      await flushPromises();
    },
    async filterStatus(status) {
      dom.statusSelect.value = status;
      fireEvent.change(dom.statusSelect);
      await flushPromises();
    },
    async clearChip() {
      const btn = dom.summary.querySelector('.bundle-selected-chip__clear');
      if (!btn) return;
      fireEvent.click(btn);
      await flushPromises();
    },
    resultsText() {
      return dom.results.textContent || '';
    },
    isEmptyVisible() {
      return !dom.empty.hidden;
    },
    latestLookupConfig() {
      return lookup.latestConfig();
    },
    chipVisible() {
      return dom.summary.dataset.empty !== 'true';
    },
    chipText() {
      const label = dom.summary.querySelector('.bundle-selected-chip__label');
      return label?.textContent.trim() || '';
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section>
      <label>
        Search bundles
        <div class="bundle-search-input" id="bundleSearchInputWrap">
          <div id="bundleSearchSummary" class="bundle-selected-chip" data-empty="true">
            <span class="bundle-selected-chip__label">No book selected.</span>
            <button type="button" class="bundle-selected-chip__clear" aria-label="Clear selected book filter">×</button>
          </div>
          <input id="bundleSearchInput" class="bundle-search-input-field" type="search" aria-autocomplete="list" aria-controls="bundleSearchSuggestions" />
        </div>
        <input type="hidden" id="bundleSearchHiddenInput" />
        <ul id="bundleSearchSuggestions" role="listbox"></ul>
        <p id="bundleSearchMsg" class="hint"></p>
      </label>
      <label>
        Supplier
        <select id="bundleFilterSupplier">
          <option value="">All suppliers</option>
        </select>
      </label>
      <label>
        Status
        <select id="bundleFilterStatus">
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
        </select>
      </label>
      <div id="bundleResults"></div>
      <p id="bundleEmpty" hidden>No bundles found.</p>
    </section>
  `;

  return {
    searchInput: document.getElementById('bundleSearchInput'),
    searchHiddenInput: document.getElementById('bundleSearchHiddenInput'),
    suggestions: document.getElementById('bundleSearchSuggestions'),
    summary: document.getElementById('bundleSearchSummary'),
    searchMsg: document.getElementById('bundleSearchMsg'),
    supplierSelect: document.getElementById('bundleFilterSupplier'),
    statusSelect: document.getElementById('bundleFilterStatus'),
    results: document.getElementById('bundleResults'),
    empty: document.getElementById('bundleEmpty'),
  };
}

function buildLookupFactory() {
  const instances = [];
  const factory = jest.fn((config = {}) => {
    instances.push(config);
    return {
      dispose: jest.fn(),
    };
  });

  return {
    factory,
    emitSelection(book) {
      const latest = instances[instances.length - 1];
      latest?.onSelect?.(book);
    },
    latestConfig() {
      return instances[instances.length - 1] || null;
    },
  };
}

function defaultBundles() {
  return [
    {
      id: 'bundle-a',
      title: 'Magic Starter Pack',
      supplier: { id: 'sup-1', name: 'Lotus Books' },
      status: 'Draft',
      bundlePriceRupees: 375,
      bookCount: 3,
      books: [
        { id: 'book-1', title: 'Magic Tree House' },
        { id: 'book-2', title: 'Forest Magic' },
      ],
    },
    {
      id: 'bundle-b',
      title: 'Sci-Fi Combo',
      supplier: { id: 'sup-2', name: 'Paper Trail' },
      status: 'Published',
      bundlePriceRupees: 420,
      bookCount: 2,
      books: [{ id: 'book-3', title: 'Mars Colony' }],
    },
  ];
}

function defaultSuppliers() {
  return [
    { id: 'sup-1', name: 'Lotus Books' },
    { id: 'sup-2', name: 'Paper Trail' },
  ];
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function renderToggleMarkup(bundle) {
  const status = bundle.status || 'Draft';
  const isPublished = status === 'Published';
  return `
    <label class="bundle-toggle bundle-toggle--inline">
      <span class="bundle-toggle__control">
        <input type="checkbox" role="switch" aria-label="Publish bundle" aria-checked="${isPublished}" ${isPublished ? 'checked' : ''} />
        <span class="bundle-toggle__track">
          <span class="bundle-toggle__thumb"></span>
        </span>
      </span>
      <span class="bundle-toggle__state">${isPublished ? 'Published' : 'Draft'}</span>
    </label>
  `;
}
