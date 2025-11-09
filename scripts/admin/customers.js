import { compactText } from '../helpers/text.js';

const DEFAULT_COUNTRY_CODE = '+91';

export function initCustomerMaster(elements = {}, firebaseDeps) {
  const deps = resolveFirebaseDeps(firebaseDeps);
  if (!deps) {
    console.warn('initCustomerMaster requires Firebase dependencies.');
    return;
  }

  const refs = {
    form: elements.form,
    nameInput: elements.nameInput,
    addressInput: elements.addressInput,
    locationInput: elements.locationInput,
    whatsAppInput: elements.whatsAppInput,
    msgEl: elements.msgEl,
    listEl: elements.listEl,
  };

  if (!hasRequiredElements(refs)) {
    console.warn('initCustomerMaster expected form controls to be provided.');
    return;
  }

  const state = { submitting: false };
  refs.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await handleSubmit(refs, deps, state);
  });

  attachSnapshotListener(refs.listEl, deps);
}

export function normalizeCustomerName(name = '') {
  return compactText(name);
}

export function normalizeCustomerAddress(address = '') {
  return compactText(address);
}

export function normalizeCustomerLocation(location = '') {
  return compactText(location);
}

export function sanitizeWhatsAppNumber(value = '') {
  const digitsOnly = String(value ?? '').replace(/\D/g, '');
  const trimmedDigits =
    digitsOnly.length === 12 && digitsOnly.startsWith('91')
      ? digitsOnly.slice(-10)
      : digitsOnly;
  return normalizeDigits(trimmedDigits);
}

export function makeCustomerKey(countryCode = DEFAULT_COUNTRY_CODE, whatsAppDigits = '') {
  const safeCode = countryCode || DEFAULT_COUNTRY_CODE;
  const digitsOnly = normalizeDigits(whatsAppDigits);
  return `${safeCode}#${digitsOnly}`;
}

export function buildCustomerPayload(payload = {}) {
  const {
    name = '',
    address = '',
    location = '',
    whatsApp = '',
    serverTimestamp,
  } = payload;

  const normalizedName = normalizeCustomerName(name);
  const normalizedAddress = normalizeCustomerAddress(address);
  const normalizedLocation = normalizeCustomerLocation(location);
  const normalizedWhatsApp = sanitizeWhatsAppNumber(whatsApp);
  const whatsAppDigits = normalizeDigits(normalizedWhatsApp);
  const countryCode = DEFAULT_COUNTRY_CODE;

  const timestampFn =
    typeof serverTimestamp === 'function'
      ? serverTimestamp
      : () => new Date();

  return {
    name: normalizedName,
    address: normalizedAddress,
    location: normalizedLocation,
    whatsApp: normalizedWhatsApp,
    whatsAppDigits,
    countryCode,
    customerKey: makeCustomerKey(countryCode, whatsAppDigits),
    createdAt: timestampFn(),
    updatedAt: timestampFn(),
  };
}

function resolveFirebaseDeps(firebaseDeps) {
  if (firebaseDeps) {
    return firebaseDeps;
  }
  return globalThis.__firebaseMocks?.exports || null;
}

function hasRequiredElements(refs = {}) {
  return (
    refs.form &&
    refs.nameInput &&
    refs.whatsAppInput &&
    refs.msgEl &&
    refs.listEl
  );
}

async function handleSubmit(refs, deps, state) {
  if (state.submitting) return;

  const nameValue = refs.nameInput.value ?? '';
  const addressValue = refs.addressInput?.value ?? '';
  const locationValue = refs.locationInput?.value ?? '';
  const whatsAppValue = refs.whatsAppInput.value ?? '';

  const normalizedName = normalizeCustomerName(nameValue);
  if (!normalizedName) {
    setMessage(refs.msgEl, 'Customer name is required.', true);
    return;
  }

  if (!whatsAppValue.trim()) {
    setMessage(refs.msgEl, 'WhatsApp number is required.', true);
    return;
  }

  const sanitizedWhatsApp = sanitizeWhatsAppNumber(whatsAppValue);
  const hasInvalidChars = /[^0-9+()\-\s]/i.test(whatsAppValue);
  if (hasInvalidChars) {
    setMessage(refs.msgEl, 'Enter a valid WhatsApp number.', true);
    return;
  }
  if (!sanitizedWhatsApp) {
    setMessage(refs.msgEl, 'Enter a valid 10-digit WhatsApp number.', true);
    return;
  }

  state.submitting = true;
  try {
    const payload = buildCustomerPayload({
      name: nameValue,
      address: addressValue,
      location: locationValue,
      whatsApp: whatsAppValue,
      serverTimestamp: deps.serverTimestamp,
    });

    const isDuplicate = await hasDuplicateCustomer(
      payload.whatsAppDigits,
      payload.countryCode,
      deps
    );
    if (isDuplicate) {
      setMessage(refs.msgEl, 'Duplicate customer already exists.', true);
      return;
    }

    const customersRef = deps.collection(deps.db, 'customers');
    await deps.addDoc(customersRef, payload);

    if (typeof refs.form.reset === 'function') {
      refs.form.reset();
    } else {
      refs.nameInput.value = '';
      if (refs.addressInput) refs.addressInput.value = '';
      if (refs.locationInput) refs.locationInput.value = '';
      refs.whatsAppInput.value = '';
    }

    setMessage(refs.msgEl, 'Customer added successfully.');
  } catch (err) {
    console.error(err);
    setMessage(refs.msgEl, 'Unable to add customer right now.', true);
  } finally {
    state.submitting = false;
  }
}

async function hasDuplicateCustomer(whatsAppDigits, countryCode, deps) {
  if (
    !whatsAppDigits ||
    !countryCode ||
    typeof deps.getDocs !== 'function' ||
    typeof deps.where !== 'function' ||
    typeof deps.query !== 'function' ||
    typeof deps.collection !== 'function'
  ) {
    return false;
  }

  const customersRef = deps.collection(deps.db, 'customers');
  const digitWhere = deps.where('whatsAppDigits', '==', whatsAppDigits);
  const countryWhere = deps.where('countryCode', '==', countryCode);
  const constraints = [digitWhere, countryWhere];
  if (typeof deps.limit === 'function') {
    constraints.push(deps.limit(1));
  }
  const dupQuery = deps.query(customersRef, ...constraints);
  const snapshot = await deps.getDocs(dupQuery);

  if (!snapshot) return false;
  if (typeof snapshot.empty === 'boolean') {
    return snapshot.empty === false;
  }
  return Boolean(snapshot.docs?.length);
}

function attachSnapshotListener(listEl, deps) {
  if (
    !listEl ||
    typeof deps.onSnapshot !== 'function' ||
    typeof deps.collection !== 'function'
  )
    return;

  const customersRef = deps.collection(deps.db, 'customers');
  const queryRef =
    typeof deps.query === 'function' && typeof deps.orderBy === 'function'
      ? deps.query(customersRef, deps.orderBy('name'))
      : customersRef;

  deps.onSnapshot(queryRef, (snapshot = { docs: [] }) => {
    renderCustomerList(listEl, snapshot.docs || []);
  });
}

function renderCustomerList(listEl, docs = []) {
  if (!listEl) return;

  const customers = docs
    .map((doc) => {
      const data = typeof doc.data === 'function' ? doc.data() : doc.data || {};
      return { id: doc.id, ...data };
    })
    .sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      if (!nameA && nameB) return 1;
      if (nameA && !nameB) return -1;
      return nameA.localeCompare(nameB);
    });

  listEl.innerHTML = '';

  if (!customers.length) {
    const emptyRow = document.createElement('li');
    emptyRow.textContent = 'No customers yet.';
    emptyRow.classList.add('muted');
    listEl.appendChild(emptyRow);
    return;
  }

  const fragment = document.createDocumentFragment();
  customers.forEach((customer) => {
    const li = document.createElement('li');
    const name = customer.name || '(no name)';
    const detailParts = [];
    if (customer.location) detailParts.push(customer.location);
    if (customer.whatsApp) {
      detailParts.push(customer.whatsApp);
    } else if (customer.whatsAppDigits) {
      detailParts.push(customer.whatsAppDigits);
    }
    li.textContent = detailParts.length
      ? `${name} — ${detailParts.join(' • ')}`
      : name;
    fragment.appendChild(li);
  });

  listEl.appendChild(fragment);
}

function setMessage(msgEl, text, isError = false) {
  if (!msgEl) return;
  msgEl.textContent = text ?? '';
  msgEl.dataset.status = isError ? 'error' : 'success';
}

function normalizeDigits(value = '') {
  const digitsOnly = String(value ?? '').replace(/\D/g, '');
  if (digitsOnly.length !== 10) {
    return '';
  }
  return digitsOnly;
}
