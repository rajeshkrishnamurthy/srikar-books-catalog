import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';

const moduleUrl = new URL('../../scripts/admin/salesTitleAutocomplete.js', import.meta.url);

export async function createSalesTitleAutocompleteHarness(options = {}) {
  const {
    loadBooks = jest.fn(async () => []),
    onBookSelect = jest.fn(),
    maxResults = 5,
    debounceMs = 0,
  } = options;

  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const module = await import(moduleUrl.href);
  const api =
    module.initSaleTitleAutocomplete(
      {
        input: dom.bookSearchInput,
        list: dom.suggestionsList,
        hiddenInput: dom.bookIdInput,
        summaryEl: dom.summaryEl,
        msgEl: dom.msgEl,
      },
      {
        loadBooks,
        onBookSelect,
        maxResults,
        debounceMs,
      }
    ) || {};

  return {
    ...dom,
    api,
    loadBooks,
    onBookSelect,
    async typeQuery(value) {
      dom.bookSearchInput.value = value;
      fireEvent.input(dom.bookSearchInput);
      await Promise.resolve();
    },
    pressKey(key) {
      fireEvent.keyDown(dom.bookSearchInput, { key, code: key });
    },
    clickSuggestionByIndex(index) {
      const items = this.getSuggestions();
      const target = items[index];
      if (target) {
        fireEvent.click(target);
      }
      return target;
    },
    getSuggestions() {
      return Array.from(dom.suggestionsList.querySelectorAll('[role="option"]'));
    },
    findSuggestionByText(text) {
      return this.getSuggestions().find((item) =>
        item.textContent.toLowerCase().includes(String(text).toLowerCase())
      );
    },
    getActiveSuggestion() {
      return dom.suggestionsList.querySelector('[data-active="true"]');
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section id="saleTitleAutocomplete">
      <label for="saleBookSearch">Book title</label>
      <input
        id="saleBookSearch"
        name="saleBookSearch"
        type="text"
        autocomplete="off"
        placeholder="Start typing a title"
        aria-autocomplete="list"
        aria-expanded="false"
        aria-controls="saleBookSuggestions"
      />
      <ul
        id="saleBookSuggestions"
        role="listbox"
        aria-label="Matching titles"
      ></ul>
      <input id="saleLineBookId" type="hidden" />
      <p id="saleLineBookSummary" data-empty="true">No book selected</p>
      <p id="saleBookMsg" class="muted" aria-live="polite"></p>
    </section>
  `;

  return {
    bookSearchInput: document.getElementById('saleBookSearch'),
    suggestionsList: document.getElementById('saleBookSuggestions'),
    bookIdInput: document.getElementById('saleLineBookId'),
    summaryEl: document.getElementById('saleLineBookSummary'),
    msgEl: document.getElementById('saleBookMsg'),
  };
}
