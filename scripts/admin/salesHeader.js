import { compactText } from '../helpers/text.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SALE_DATE_INPUT_PATTERN = /^(\d{2})-([a-z]{3})-(\d{2})$/i;
const MONTH_LOOKUP = {
  jan: { label: 'Jan', index: 0 },
  feb: { label: 'Feb', index: 1 },
  mar: { label: 'Mar', index: 2 },
  apr: { label: 'Apr', index: 3 },
  may: { label: 'May', index: 4 },
  jun: { label: 'Jun', index: 5 },
  jul: { label: 'Jul', index: 6 },
  aug: { label: 'Aug', index: 7 },
  sep: { label: 'Sep', index: 8 },
  oct: { label: 'Oct', index: 9 },
  nov: { label: 'Nov', index: 10 },
  dec: { label: 'Dec', index: 11 },
};

export function initSaleHeader(elements = {}, options = {}) {
  const refs = {
    form: elements.form || null,
    saleDateInput: elements.saleDateInput || null,
    customerSummary: elements.customerSummary || null,
    customerIdInput: elements.customerIdInput || null,
    continueBtn: elements.continueBtn || null,
    msgEl: elements.msgEl || null,
  };
  if (!hasRequiredRefs(refs)) {
    console.warn(
      'initSaleHeader requires form, sale date, summary, id, message, and button refs.'
    );
    return null;
  }

  const deps = {
    lookup: options.lookup || null,
    onHeaderReady: typeof options.onHeaderReady === 'function' ? options.onHeaderReady : () => {},
    serverTimestamp:
      typeof options.serverTimestamp === 'function' ? options.serverTimestamp : () => new Date(),
    clock: buildClock(options.clock),
  };

  const defaultSummary = resolveDefaultSummary();
  refs.customerSummary.dataset.defaultSummary = defaultSummary;
  refs.continueBtn.disabled = true;

  const state = {
    customer: null,
    saleDate: parseSaleDate(refs.saleDateInput.value),
  };

  hydrateInitialCustomer();

  const teardown = [];

  const saleDateHandler = (event) => {
    state.saleDate = parseSaleDate(event?.target?.value);
    clearMessage();
    updateContinueState();
  };
  refs.saleDateInput.addEventListener('input', saleDateHandler);
  teardown.push(() => refs.saleDateInput.removeEventListener('input', saleDateHandler));

  const submitHandler = (event) => {
    event.preventDefault();
    handleSubmit();
  };
  refs.form.addEventListener('submit', submitHandler);
  teardown.push(() => refs.form.removeEventListener('submit', submitHandler));

  const resetHandler = () => resetHeader();
  refs.form.addEventListener('reset', resetHandler);
  teardown.push(() => refs.form.removeEventListener('reset', resetHandler));

  if (deps.lookup && typeof deps.lookup.onSelect === 'function') {
    const lookupHandler = (customer) => {
      applyCustomerSelection(customer);
    };
    const disposeLookupSelect = deps.lookup.onSelect(lookupHandler);
    if (typeof disposeLookupSelect === 'function') {
      teardown.push(() => disposeLookupSelect());
    } else if (typeof deps.lookup.offSelect === 'function') {
      teardown.push(() => deps.lookup.offSelect(lookupHandler));
    }
  }

  updateContinueState();

  return {
    reset: () => resetHeader(),
    dispose: () => {
      while (teardown.length) {
        const cleanup = teardown.pop();
        try {
          cleanup?.();
        } catch (error) {
          console.error('sale header cleanup failed', error);
        }
      }
    },
  };

  function handleSubmit() {
    if (!state.customer) {
      setMessage('Please select a customer before continuing.');
      updateContinueState();
      return;
    }

    const dateValidation = validateSaleDate(state.saleDate, deps.clock);
    if (!dateValidation.valid) {
      setMessage(dateValidation.message);
      updateContinueState();
      return;
    }

    const payload = buildSaleHeaderPayload({
      customer: state.customer,
      saleDate: state.saleDate,
      serverTimestamp: deps.serverTimestamp,
    });
    deps.onHeaderReady(payload);
    setMessage('Sale header captured. You can add line items now.');
    resetHeader({ clearMessage: false });
  }

  function applyCustomerSelection(rawCustomer) {
    const normalized = normalizeCustomer(rawCustomer);
    state.customer = normalized;
    if (!normalized) {
      refs.customerIdInput.value = '';
      refs.customerSummary.textContent = defaultSummary;
      refs.customerSummary.dataset.empty = 'true';
      updateContinueState();
      return;
    }
    refs.customerIdInput.value = normalized.id;
    refs.customerSummary.textContent = buildSummaryText(normalized, defaultSummary);
    refs.customerSummary.dataset.empty = 'false';
    clearMessage();
    updateContinueState();
  }

  function resetHeader(options = {}) {
    const { clearMessage: shouldClearMsg = true } = options;
    state.customer = null;
    state.saleDate = parseSaleDate('');
    refs.customerIdInput.value = '';
    refs.saleDateInput.value = '';
    refs.customerSummary.textContent = defaultSummary;
    refs.customerSummary.dataset.empty = 'true';
    if (shouldClearMsg) {
      clearMessage();
    }
    updateContinueState();
  }

  function hydrateInitialCustomer() {
    const initialCustomer = extractCustomerFromDom();
    if (!initialCustomer) {
      if (!refs.customerSummary.textContent) {
        refs.customerSummary.textContent = defaultSummary;
      }
      refs.customerSummary.dataset.empty = 'true';
      return;
    }
    applyCustomerSelection(initialCustomer);
  }

  function extractCustomerFromDom() {
    const id = (refs.customerIdInput.value || '').trim();
    if (!id) {
      return null;
    }
    const dataset = refs.customerSummary.dataset || {};
    const summaryText = refs.customerSummary.textContent?.trim() || '';
    const isDefaultSummary = !summaryText || summaryText === defaultSummary;
    const candidate = {
      id,
      name:
        dataset.customerName ||
        dataset.name ||
        (!isDefaultSummary ? summaryText : '') ||
        '',
      location: dataset.customerLocation || dataset.location || '',
      whatsApp:
        dataset.customerWhatsapp ||
        dataset.customerWhatsApp ||
        dataset.whatsApp ||
        dataset.whatsapp ||
        '',
    };
    const datasetClaimsSelection = dataset.empty === 'false';
    if (!candidate.name && !candidate.location && !candidate.whatsApp) {
      if (!datasetClaimsSelection) {
        return null;
      }
    }
    return candidate;
  }

  function resolveDefaultSummary() {
    const dataset = refs.customerSummary.dataset || {};
    if (dataset.defaultSummary) {
      return dataset.defaultSummary;
    }
    const hasPreloadedCustomer =
      dataset.empty === 'false' || Boolean(refs.customerIdInput.value);
    if (!hasPreloadedCustomer && refs.customerSummary.textContent) {
      return refs.customerSummary.textContent;
    }
    return 'No customer selected';
  }

  function updateContinueState() {
    const hasCustomer = !!state.customer?.id;
    const dateGood = isSaleDateReady(state.saleDate, deps.clock);
    refs.continueBtn.disabled = !(hasCustomer && dateGood);
  }

  function setMessage(text) {
    if (!refs.msgEl) return;
    refs.msgEl.textContent = text || '';
  }

  function clearMessage() {
    if (!refs.msgEl) return;
    refs.msgEl.textContent = '';
  }
}

export function buildSaleHeaderPayload(options = {}) {
  const { customer = {}, saleDate, serverTimestamp } = options;
  const normalizedCustomer = normalizeCustomer(customer);
  const parsedSaleDate = ensureSaleDateState(saleDate);

  if (!normalizedCustomer || !parsedSaleDate.iso) {
    return {};
  }

  const createdAt = resolveTimestamp(serverTimestamp);
  const updatedAt = cloneTimestamp(createdAt);

  return {
    customerId: normalizedCustomer.id,
    customerSummary: {
      name: normalizedCustomer.name,
      location: normalizedCustomer.location,
      whatsApp: normalizedCustomer.whatsApp,
    },
    saleDateDisplay: parsedSaleDate.display,
    saleDateIso: parsedSaleDate.iso,
    saleDateUtc: buildUtcMidnightIso(parsedSaleDate.iso),
    createdAt,
    updatedAt,
  };
}

function normalizeCustomer(customer = null) {
  if (!customer || !customer.id) {
    return null;
  }
  return {
    id: String(customer.id),
    name: compactText(customer.name ?? ''),
    location: compactText(customer.location ?? ''),
    whatsApp: compactText(customer.whatsApp ?? ''),
  };
}

function buildSummaryText(customer, fallback) {
  const parts = [customer.name, customer.location].filter(Boolean);
  return parts.length ? parts.join(' — ') : fallback;
}

function isSaleDateReady(dateState, clock) {
  if (!dateState?.iso) return false;
  return !isFutureDate(dateState.iso, clock);
}

function validateSaleDate(dateState, clock) {
  const display = dateState?.display || '';
  const iso = dateState?.iso || '';
  if (!display) {
    return { valid: false, message: 'Sale date is required.' };
  }
  if (!iso) {
    return {
      valid: false,
      message: 'Sale date must use dd-mon-yy format (e.g., 10-Feb-24).',
    };
  }
  if (isFutureDate(iso, clock)) {
    return { valid: false, message: 'Sale date cannot be in the future.' };
  }
  return { valid: true, message: '' };
}

function isFutureDate(dateIso, clock) {
  if (!dateIso) return true;
  const todayIso = getTodayIso(clock);
  if (!todayIso) return false;
  return dateIso > todayIso;
}

function getTodayIso(clock) {
  if (clock) {
    if (typeof clock.todayIso === 'function') {
      return clock.todayIso();
    }
    if (typeof clock.todayIso === 'string') {
      return clock.todayIso;
    }
  }
  const nowFn = clock?.now;
  if (typeof nowFn === 'function') {
    return formatLocalDate(nowFn());
  }
  return formatLocalDate(new Date());
}

function formatLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildUtcMidnightIso(dateIso) {
  if (!ISO_DATE_PATTERN.test(dateIso)) return '';
  const [year, month, day] = dateIso.split('-').map((part) => parseInt(part, 10));
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  return utcDate.toISOString();
}

function hasRequiredRefs(refs = {}) {
  return Boolean(
    refs.form &&
      refs.saleDateInput &&
      refs.customerSummary &&
      refs.customerIdInput &&
      refs.continueBtn &&
      refs.msgEl
  );
}

function buildClock(clock) {
  const defaultClock = {
    now: () => new Date(),
  };
  if (clock && typeof clock === 'object') {
    const overrides = { ...clock };
    if (typeof overrides.now !== 'function') {
      overrides.now = defaultClock.now;
    }
    return overrides;
  }
  return defaultClock;
}

function parseSaleDate(value) {
  const raw = sanitizeSaleDateInput(value);
  if (!raw) {
    return { raw: '', display: '', iso: '' };
  }
  const match = raw.match(SALE_DATE_INPUT_PATTERN);
  if (!match) {
    return { raw, display: raw, iso: '' };
  }
  const day = match[1];
  const monthKey = match[2].toLowerCase();
  const yearFragment = match[3];
  const monthInfo = MONTH_LOOKUP[monthKey];
  const dayNumber = parseInt(day, 10);
  const yearValue = convertYear(yearFragment);

  if (
    !monthInfo ||
    yearValue == null ||
    !isValidDateParts(yearValue, monthInfo.index, dayNumber)
  ) {
    return { raw, display: raw, iso: '' };
  }

  const isoYear = String(yearValue).padStart(4, '0');
  const iso = `${isoYear}-${String(monthInfo.index + 1).padStart(2, '0')}-${day}`;
  const display = `${day}-${monthInfo.label}-${yearFragment}`;
  return { raw, display, iso };
}

function sanitizeSaleDateInput(value) {
  return String(value ?? '').trim();
}

function isValidDateParts(year, monthIndex, day) {
  if (!Number.isInteger(year)) {
    return false;
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return false;
  }
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return false;
  }
  const testDate = new Date(Date.UTC(year, monthIndex, day));
  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === monthIndex &&
    testDate.getUTCDate() === day
  );
}

function convertYear(fragment) {
  const trimmed = String(fragment ?? '').trim();
  if (/^\d{4}$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (!/^\d{2}$/.test(trimmed)) {
    return null;
  }
  return 2000 + parseInt(trimmed, 10);
}

function ensureSaleDateState(value) {
  if (value && typeof value === 'object' && 'iso' in value && 'display' in value) {
    return value;
  }
  return parseSaleDate(value);
}

function resolveTimestamp(factory) {
  if (typeof factory === 'function') {
    return factory();
  }
  return new Date();
}

function cloneTimestamp(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  return value;
}
