import { compactText } from '../helpers/text.js';

const COLLECTION_PATH = 'customers';
const DEBOUNCE_MS = 200;

export function initCustomerLookup(elements = {}, options = {}, firebaseDeps) {
  const refs = {
    searchInput: elements.searchInput || null,
    listEl: elements.listEl || null,
    emptyEl: elements.emptyEl || null,
    clearBtn: elements.clearBtn || null,
  };
  const deps = resolveFirebaseDeps(firebaseDeps);
  const onSelect = typeof options.onSelect === 'function' ? options.onSelect : () => {};

  if (!deps || !hasRequiredElements(refs)) {
    console.warn('initCustomerLookup requires lookup DOM refs and Firebase deps.');
    return null;
  }

  const state = {
    baseCustomers: [],
    customers: [],
    filteredCustomers: [],
    filteredQuery: '',
    query: '',
    selectedId: null,
    debounceHandle: null,
    forceEmptyView: true,
  };
  const teardown = [];

  function notifySelectionCleared(force = false) {
    if (!force && !state.selectedId) {
      return false;
    }
    state.selectedId = null;
    onSelect(null);
    clearSelectedRowUi(refs.listEl);
    if (!state.query) {
      state.forceEmptyView = true;
    }
    return true;
  }

  const searchHandler = (event) => {
    const rawValue = event?.target?.value ?? '';
    const nextQuery = normalizeLookupQuery(rawValue);
    const clearingQuery = !nextQuery && Boolean(state.query);

    if (!nextQuery) {
      clearScheduledLookup(state);
      state.query = '';
      state.filteredCustomers = [];
      state.filteredQuery = '';
      state.forceEmptyView = !state.selectedId;
      renderLookupList(refs, state);
      return;
    }

    state.forceEmptyView = false;
    state.query = nextQuery;
    state.filteredCustomers = [];
    state.filteredQuery = '';
    renderLookupList(refs, state);
    scheduleLookup(nextQuery);
  };
  refs.searchInput.addEventListener('input', searchHandler);
  teardown.push(() => refs.searchInput.removeEventListener('input', searchHandler));

  if (refs.clearBtn) {
    const clearHandler = () => {
      refs.searchInput.value = '';
      clearScheduledLookup(state);
      state.query = '';
      state.filteredCustomers = [];
      state.filteredQuery = '';
      state.forceEmptyView = true;
      notifySelectionCleared(true);
      renderLookupList(refs, state);
    };
    refs.clearBtn.addEventListener('click', clearHandler);
    teardown.push(() => refs.clearBtn.removeEventListener('click', clearHandler));
  }

  if (refs.listEl) {
    const listClickHandler = (event) => {
      const row = event.target?.closest?.('li.customer-lookup-row');
      if (!row) return;
      const customerId = row.dataset.customerId;
      if (!customerId) return;
      const selected = getRenderableCustomers(state).find(
        (customer) => customer.id === customerId
      );
      if (!selected) return;
      state.selectedId = customerId;
      state.forceEmptyView = false;
      onSelect({
        id: selected.id,
        name: selected.name || '',
        location: selected.location || '',
        address: selected.address || '',
        whatsApp: selected.whatsApp || '',
        whatsAppDigits: selected.whatsAppDigits || '',
      });
      applySelectionStyles(row);
    };
    refs.listEl.addEventListener('click', listClickHandler);
    teardown.push(() => refs.listEl.removeEventListener('click', listClickHandler));
  }

  const unsubscribe = attachSnapshotListener(deps, (customers) => {
    state.baseCustomers = customers;
    if (!customers.some((customer) => customer.id === state.selectedId)) {
      notifySelectionCleared();
    }
    if (state.query) {
      applyClientFilter(state.query);
    } else {
      state.filteredCustomers = [];
      state.filteredQuery = '';
      state.forceEmptyView = true;
      renderLookupList(refs, state);
    }
  });
  if (typeof unsubscribe === 'function') {
    teardown.push(() => unsubscribe());
  }

  renderLookupList(refs, state);

  return {
    dispose() {
      clearScheduledLookup(state);
      while (teardown.length) {
        const cleanup = teardown.pop();
        try {
          cleanup?.();
        } catch (err) {
          console.error('customer lookup dispose error', err);
        }
      }
    },
  };

  function scheduleLookup(keyword) {
    clearScheduledLookup(state);
    if (!keyword) return;
    state.debounceHandle = setTimeout(() => {
      state.debounceHandle = null;
      applyClientFilter(keyword);
    }, DEBOUNCE_MS);
  }

  function applyClientFilter(keyword) {
    if (!keyword) return;
    const normalized = keyword.toLowerCase();
    state.filteredCustomers = state.baseCustomers.filter((customer) =>
      (customer.name || '').toLowerCase().includes(normalized)
    );
    state.filteredQuery = keyword;
    renderLookupList(refs, state);
  }
}

export function normalizeLookupQuery(value = '') {
  const normalized = compactText(value ?? '').toLowerCase();
  return normalized.length >= 2 ? normalized : '';
}

function resolveFirebaseDeps(firebaseDeps) {
  if (firebaseDeps) return firebaseDeps;
  return globalThis.__firebaseMocks?.exports || null;
}

function hasRequiredElements(refs) {
  return refs.searchInput && refs.listEl && refs.emptyEl;
}

function attachSnapshotListener(deps, onResults) {
  if (!deps.collection || !deps.onSnapshot) return null;
  const customersRef = deps.collection(deps.db, COLLECTION_PATH);
  const queryRef =
    typeof deps.query === 'function' && typeof deps.orderBy === 'function'
      ? deps.query(customersRef, deps.orderBy('name'))
      : customersRef;
  return deps.onSnapshot(queryRef, (snapshot = { docs: [] }) => {
    const docs = Array.isArray(snapshot.docs) ? snapshot.docs : [];
    const customers = buildCustomersFromDocs(docs);
    if (typeof onResults === 'function') {
      onResults(customers);
    }
  });
}

function buildCustomersFromDocs(docs = []) {
  return docs.map((doc) => {
    const data = typeof doc.data === 'function' ? doc.data() : doc.data || {};
    return {
      id: doc?.id || data.id || '',
      name: data.name || '',
      location: data.location || '',
      address: data.address || '',
      whatsApp: data.whatsApp || '',
      whatsAppDigits: data.whatsAppDigits || '',
    };
  });
}

function renderLookupList(refs, state) {
  const { listEl, emptyEl } = refs;
  if (!listEl) return;

  listEl.innerHTML = '';
  const customersToRender = sortCustomers(getRenderableCustomers(state));

  if (!customersToRender.length) {
    toggleEmptyState(emptyEl, true);
    return;
  }

  toggleEmptyState(emptyEl, false);
  const fragment = document.createDocumentFragment();

  customersToRender.forEach((customer) => {
    const row = document.createElement('li');
    row.classList.add('customer-lookup-row');
    if (customer.id) {
      row.dataset.customerId = customer.id;
    }
    const isSelected = Boolean(state.selectedId && customer.id === state.selectedId);
    if (isSelected) {
      row.classList.add('selected');
      row.dataset.state = 'selected';
    } else {
      row.classList.remove('selected');
      row.dataset.state = 'idle';
    }

    const textWrap = document.createElement('div');
    textWrap.classList.add('customer-lookup-text');

    const nameEl = document.createElement('span');
    nameEl.classList.add('customer-lookup-name');
    nameEl.appendChild(buildHighlightedNodes(customer.name || '(no name)', state.query));
    textWrap.appendChild(nameEl);

    const detailSegments = [];
    if (customer.location) detailSegments.push(customer.location);
    if (customer.address) detailSegments.push(customer.address);
    if (!customer.address && (customer.whatsApp || customer.whatsAppDigits)) {
      detailSegments.push(customer.whatsApp || customer.whatsAppDigits);
    }
    if (detailSegments.length) {
      const meta = document.createElement('span');
      meta.classList.add('customer-lookup-meta');
      meta.textContent = detailSegments.join(' • ');
      textWrap.appendChild(meta);
    }

    row.appendChild(textWrap);

    if (isSelected) {
      const chip = createSelectedChip(row.ownerDocument);
      chip.classList.add('customer-lookup-selected-chip--inline');
      row.appendChild(chip);
    }

    fragment.appendChild(row);
  });

  listEl.appendChild(fragment);
}

function applySelectionStyles(targetRow) {
  if (!targetRow || !targetRow.ownerDocument) return;
  const listEl = targetRow.parentElement;
  if (!listEl) return;
  const previous = listEl.querySelector('li[data-state="selected"]');
  if (previous && previous !== targetRow) {
    setRowAsIdle(previous);
  }
  setRowAsSelected(targetRow);
}

function setRowAsSelected(row) {
  if (!row) return;
  row.dataset.state = 'selected';
  row.classList.add('selected');
  let chip = row.querySelector('[data-role="selected-chip"]');
  if (!chip) {
    chip = createSelectedChip(row.ownerDocument);
    chip.textContent = 'Selected';
    row.appendChild(chip);
  }
}

function setRowAsIdle(row) {
  if (!row) return;
  row.dataset.state = 'idle';
  row.classList.remove('selected');
  const chip = row.querySelector('[data-role="selected-chip"]');
  chip?.remove();
}

function clearSelectedRowUi(listEl) {
  if (!listEl) return;
  const selectedRow = listEl.querySelector('li[data-state="selected"]');
  if (selectedRow) {
    setRowAsIdle(selectedRow);
  }
}

function getRenderableCustomers(state) {
  if (state.query) {
    if (state.filteredQuery === state.query) {
      return state.filteredCustomers;
    }
    return [];
  }
  if (state.forceEmptyView) {
    return [];
  }
  return [];
}

function sortCustomers(customers = []) {
  const clone = [...customers];
  clone.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (!nameA && nameB) return 1;
    if (nameA && !nameB) return -1;
    return nameA.localeCompare(nameB);
  });
  return clone;
}

function buildHighlightedNodes(text, query) {
  const fragment = document.createDocumentFragment();
  const safeText = text || '';
  if (!query) {
    fragment.appendChild(document.createTextNode(safeText));
    return fragment;
  }
  const lowerText = safeText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) {
    fragment.appendChild(document.createTextNode(safeText));
    return fragment;
  }
  const before = safeText.slice(0, matchIndex);
  const match = safeText.slice(matchIndex, matchIndex + query.length);
  const after = safeText.slice(matchIndex + query.length);
  if (before) fragment.appendChild(document.createTextNode(before));
  const mark = document.createElement('mark');
  mark.textContent = match;
  fragment.appendChild(mark);
  if (after) fragment.appendChild(document.createTextNode(after));
  return fragment;
}

function toggleEmptyState(emptyEl, show) {
  if (!emptyEl) return;
  emptyEl.hidden = !show;
}

function clearScheduledLookup(state) {
  if (state.debounceHandle) {
    clearTimeout(state.debounceHandle);
    state.debounceHandle = null;
  }
}

function createSelectedChip(doc) {
  const chip = doc.createElement('span');
  chip.dataset.role = 'selected-chip';
  chip.classList.add('customer-lookup-selected-chip');
  chip.textContent = 'Selected';
  return chip;
}
