import { compactText } from '../helpers/text.js';

export function initSaleTitleAutocomplete(elements = {}, options = {}) {
  const refs = {
    input: elements.input || null,
    list: elements.list || null,
    hiddenInput: elements.hiddenInput || null,
    summaryEl: elements.summaryEl || null,
    msgEl: elements.msgEl || null,
  };

  if (!refs.input || !refs.list || !refs.hiddenInput || !refs.summaryEl) {
    console.warn(
      'initSaleTitleAutocomplete requires input, suggestions list, hidden book input, and summary elements.'
    );
    return null;
  }

  const deps = {
    loadBooks: options.loadBooks || (() => Promise.resolve([])),
    onBookSelect: typeof options.onBookSelect === 'function' ? options.onBookSelect : () => {},
    onNoMatch: typeof options.onNoMatch === 'function' ? options.onNoMatch : () => {},
    maxResults: Number.isInteger(options.maxResults) ? options.maxResults : 5,
    debounceMs: Number.isInteger(options.debounceMs) ? options.debounceMs : 0,
  };

  const state = {
    index: [],
    filtered: [],
    activeIndex: -1,
    debounceHandle: null,
    loading: false,
    hasSelection:
      (refs.summaryEl?.dataset?.empty || '') === 'false' || Boolean(refs.hiddenInput?.value),
  };

  const inputHandler = (event) => {
    const query = String(event?.target?.value ?? '').trim();
    if (!isValidQuery(query)) {
      clearSuggestions();
      if (refs.msgEl) {
        refs.msgEl.textContent = 'Type at least two letters to search titles.';
      }
      const hadBook = state.hasSelection || Boolean(refs.hiddenInput?.value);
      refs.hiddenInput.value = '';
      notifyHiddenInputChange();
      refs.summaryEl.textContent = 'No book selected';
      refs.summaryEl.dataset.empty = 'true';
      if (hadBook) {
        state.hasSelection = false;
        deps.onBookSelect(null);
      }
      return;
    }
    if (refs.msgEl) {
      refs.msgEl.textContent = '';
    }
    scheduleLookup(query);
  };

  const keyHandler = (event) => {
    if (!state.filtered.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectActive();
    }
  };

  refs.input.addEventListener('input', inputHandler);
  refs.input.addEventListener('keydown', keyHandler);

  return {
    dispose() {
      refs.input.removeEventListener('input', inputHandler);
      refs.input.removeEventListener('keydown', keyHandler);
      clearDebounce();
    },
  };

  function scheduleLookup(query) {
    clearDebounce();
    if (deps.debounceMs <= 0) {
      runLookup(query);
      return;
    }
    state.debounceHandle = setTimeout(async () => {
      state.debounceHandle = null;
      await runLookup(query);
    }, deps.debounceMs);
  }

  function clearDebounce() {
    if (state.debounceHandle) {
      clearTimeout(state.debounceHandle);
      state.debounceHandle = null;
    }
  }

  async function runLookup(query) {
    try {
      state.loading = true;
      const books = await deps.loadBooks();
      state.index = buildTitleIndex(books);
      const normalizedQuery = normalizeQuery(query);
      state.filtered = filterMatches(state.index, normalizedQuery, deps.maxResults);
      state.activeIndex = -1;
      if (!state.filtered.length) {
        handleNoMatch(normalizedQuery);
      } else {
        clearMessage();
        renderSuggestions();
      }
    } catch (error) {
      console.error('title autocomplete lookup failed', error);
      refs.msgEl.textContent = 'Unable to load suggestions right now.';
      clearSuggestions();
    } finally {
      state.loading = false;
    }
  }

  function renderSuggestions() {
    refs.list.innerHTML = '';
    if (!state.filtered.length) {
      refs.list.setAttribute('aria-expanded', 'false');
      return;
    }
    refs.list.setAttribute('aria-expanded', 'true');
    state.filtered.forEach((entry, index) => {
      const li = refs.list.ownerDocument.createElement('li');
      li.setAttribute('role', 'option');
      li.dataset.bookId = entry.id;
      li.dataset.active = index === state.activeIndex ? 'true' : 'false';
      li.textContent = entry.title;
      li.addEventListener('click', () => {
        handleSelection(entry);
      });
      refs.list.appendChild(li);
    });
  }

  function clearSuggestions() {
    state.filtered = [];
    state.activeIndex = -1;
    refs.list.innerHTML = '';
    refs.list.setAttribute('aria-expanded', 'false');
  }

  function moveActive(delta) {
    if (!state.filtered.length) return;
    if (state.activeIndex === -1) {
      state.activeIndex = delta > 0 ? 0 : state.filtered.length - 1;
    } else {
      state.activeIndex = (state.activeIndex + delta + state.filtered.length) % state.filtered.length;
    }
    renderSuggestions();
  }

  function selectActive() {
    if (state.activeIndex < 0 || state.activeIndex >= state.filtered.length) {
      handleNoMatch(normalizeQuery(refs.input.value));
      return;
    }
    handleSelection(state.filtered[state.activeIndex]);
  }

  function handleSelection(entry) {
    if (!entry) return;
    state.hasSelection = true;
    refs.hiddenInput.value = entry.id;
    notifyHiddenInputChange();
    refs.summaryEl.textContent = entry.title;
    refs.summaryEl.dataset.empty = 'false';
    if (refs.msgEl) {
      refs.msgEl.textContent = '';
    }
    deps.onBookSelect(entry.source);
    refs.input.value = entry.title;
    clearSuggestions();
  }

  function handleNoMatch(query) {
    clearSuggestions();
    const hadBook = state.hasSelection || Boolean(refs.hiddenInput?.value);
    if (refs.msgEl) {
      refs.msgEl.textContent = 'No catalog match found. Try typing letters from the title.';
    }
    if (refs.hiddenInput) {
      refs.hiddenInput.value = '';
      notifyHiddenInputChange();
    }
    if (refs.summaryEl) {
      refs.summaryEl.textContent = 'No book selected';
      refs.summaryEl.dataset.empty = 'true';
    }
    if (hadBook) {
      deps.onBookSelect(null);
    }
    state.hasSelection = false;
    if (query) {
      deps.onNoMatch(query);
    }
  }

  function clearMessage() {
    if (refs.msgEl) {
      refs.msgEl.textContent = '';
    }
  }

  function notifyHiddenInputChange() {
    if (!refs.hiddenInput) return;
    const event = new Event('input', { bubbles: true });
    refs.hiddenInput.dispatchEvent(event);
  }
}

export function buildTitleIndex(docs = []) {
  const seen = new Set();
  const result = [];
  docs.forEach((doc) => {
    if (!doc || !doc.id) return;
    const normalized = compactText(doc.title || '');
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      id: doc.id,
      title: normalized,
      tokens: key.split(/\s+/),
      titleLower: key,
      source: {
        id: doc.id,
        title: normalized,
        supplier: doc.supplier || null,
        history: doc.history || null,
      },
    });
  });
  return result;
}

function normalizeQuery(value) {
  return compactText(value || '').toLowerCase();
}

function isValidQuery(value) {
  const normalized = normalizeQuery(value);
  return normalized.length >= 2 && /[a-z]/i.test(normalized);
}

function filterMatches(index, query, maxResults) {
  if (!query) return index.slice(0, maxResults);
  const startsWithMatches = [];
  const containsMatches = [];
  index.forEach((entry) => {
    if (entry.tokens.some((token) => token.startsWith(query))) {
      startsWithMatches.push(entry);
    } else if (entry.titleLower.includes(query)) {
      containsMatches.push(entry);
    }
  });
  const combined = [...startsWithMatches, ...containsMatches];
  const results = [];
  const seen = new Set();
  combined.forEach((entry) => {
    if (seen.has(entry.id) || results.length >= maxResults) return;
    seen.add(entry.id);
    results.push(entry);
  });
  if (results.length < maxResults) {
    const firstChar = query.charAt(0);
    const sameFirstLetter = [];
    const others = [];
    index.forEach((entry) => {
      if (seen.has(entry.id)) return;
      if (entry.titleLower.startsWith(firstChar)) {
        sameFirstLetter.push(entry);
      } else {
        others.push(entry);
      }
    });
    [...sameFirstLetter, ...others].forEach((entry) => {
      if (results.length >= maxResults) return;
      seen.add(entry.id);
      results.push(entry);
    });
  }
  return results.slice(0, maxResults);
}
