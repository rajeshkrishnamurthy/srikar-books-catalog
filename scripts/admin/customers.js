import { compactText } from '../helpers/text.js';

const DEFAULT_COUNTRY_CODE = '+91';

export function initCustomerMaster(elements = {}, firebaseDeps) {
  const deps = resolveFirebaseDeps(firebaseDeps);
  if (!deps) {
    console.warn('initCustomerMaster requires Firebase dependencies.');
    return null;
  }

  const refs = {
    form: elements.form,
    nameInput: elements.nameInput,
    addressInput: elements.addressInput,
    locationInput: elements.locationInput,
    whatsAppInput: elements.whatsAppInput,
    msgEl: elements.msgEl,
    listEl: elements.listEl,
    idInput: elements.idInput,
    cancelBtn: elements.cancelBtn,
  };
  const teardown = [];

  if (!hasRequiredElements(refs)) {
    console.warn('initCustomerMaster expected form controls to be provided.');
    return null;
  }

  const state = { submitting: false, customersById: new Map() };
  const submitHandler = async (event) => {
    event.preventDefault();
    await handleSubmit(refs, deps, state);
  };
  refs.form.addEventListener('submit', submitHandler);
  teardown.push(() => refs.form.removeEventListener('submit', submitHandler));

  if (refs.cancelBtn) {
    const cancelHandler = () => {
      exitEditMode(refs, state);
      setMessage(refs.msgEl, 'Edit canceled.');
    };
    refs.cancelBtn.addEventListener('click', cancelHandler);
    teardown.push(() => refs.cancelBtn.removeEventListener('click', cancelHandler));
  }

  if (refs.listEl) {
    const listClickHandler = (event) => {
      const editButton = event.target?.closest?.('button[data-action="edit"]');
      if (!editButton) return;
      const customerId = editButton.dataset.customerId;
      enterEditMode(customerId, refs, state);
    };
    refs.listEl.addEventListener('click', listClickHandler);
    teardown.push(() => refs.listEl.removeEventListener('click', listClickHandler));
  }

  const unsubscribe = attachSnapshotListener(refs.listEl, deps, (customers) => {
    state.customersById.clear();
    customers.forEach((customer) => {
      if (customer.id) {
        state.customersById.set(customer.id, customer);
      }
    });
    renderCustomerList(refs.listEl, customers);
  });

  if (typeof unsubscribe === 'function') {
    teardown.push(() => unsubscribe());
  }

  return {
    dispose() {
      while (teardown.length) {
        const cleanup = teardown.pop();
        try {
          cleanup?.();
        } catch (err) {
          console.error('customer master dispose error', err);
        }
      }
      state.customersById.clear();
    },
  };
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

export function buildCustomerEditPayload(options = {}) {
  const { existing = {}, updates = {}, serverTimestamp } = options;
  const normalizedName = normalizeCustomerName(
    updates.name ?? existing.name ?? ''
  );
  const normalizedAddress = normalizeCustomerAddress(
    updates.address ?? existing.address ?? ''
  );
  const normalizedLocation = normalizeCustomerLocation(
    updates.location ?? existing.location ?? ''
  );
  const normalizedWhatsApp = sanitizeWhatsAppNumber(
    updates.whatsApp ?? existing.whatsApp ?? ''
  );
  const whatsAppDigits = normalizeDigits(normalizedWhatsApp);
  const countryCode = existing.countryCode || DEFAULT_COUNTRY_CODE;

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
    createdAt: existing.createdAt ?? null,
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

  const hasInvalidChars = /[^0-9+()\-\s]/i.test(whatsAppValue);
  if (hasInvalidChars) {
    setMessage(refs.msgEl, 'Enter a valid WhatsApp number.', true);
    return;
  }

  const sanitizedWhatsApp = sanitizeWhatsAppNumber(whatsAppValue);
  if (!sanitizedWhatsApp) {
    setMessage(refs.msgEl, 'Enter a valid 10-digit WhatsApp number.', true);
    return;
  }

  const currentCustomerId = refs.idInput?.value?.trim() || '';
  const isEditMode =
    refs.form?.dataset.mode === 'edit' && Boolean(currentCustomerId);

  state.submitting = true;
  try {
    if (isEditMode) {
      await handleEditSubmit({
        refs,
        deps,
        state,
        customerId: currentCustomerId,
        formValues: {
          name: nameValue,
          address: addressValue,
          location: locationValue,
          whatsApp: whatsAppValue,
        },
      });
      return;
    }

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

    resetForm(refs);
    setMessage(refs.msgEl, 'Customer added successfully.');
  } catch (err) {
    console.error(err);
    const errorText = isEditMode
      ? 'Unable to update customer right now.'
      : 'Unable to add customer right now.';
    setMessage(refs.msgEl, errorText, true);
  } finally {
    state.submitting = false;
  }
}

async function handleEditSubmit({ refs, deps, state, customerId, formValues }) {
  if (!customerId) {
    setMessage(refs.msgEl, 'Unable to determine which customer to edit.', true);
    return;
  }

  const existing = state.customersById?.get(customerId);
  if (!existing) {
    setMessage(refs.msgEl, 'Selected customer is no longer available.', true);
    exitEditMode(refs, state);
    return;
  }

  const updates = formValues || {};
  const payload = buildCustomerEditPayload({
    existing,
    updates,
    serverTimestamp: deps.serverTimestamp,
  });

  const isDuplicate = await hasDuplicateCustomer(
    payload.whatsAppDigits,
    payload.countryCode,
    deps,
    { excludeId: customerId }
  );
  if (isDuplicate) {
    setMessage(refs.msgEl, 'Duplicate customer already exists.', true);
    return;
  }

  if (
    typeof deps.doc !== 'function' ||
    typeof deps.updateDoc !== 'function'
  ) {
    setMessage(refs.msgEl, 'Unable to update customer right now.', true);
    return;
  }

  const customerRef = deps.doc(deps.db, 'customers', customerId);
  await deps.updateDoc(customerRef, payload);
  setMessage(refs.msgEl, 'Customer updated successfully.');
  exitEditMode(refs, state);
}

async function hasDuplicateCustomer(
  whatsAppDigits,
  countryCode,
  deps,
  options = {}
) {
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

  const excludeId =
    typeof options.excludeId === 'string' ? options.excludeId.trim() : '';
  const customersRef = deps.collection(deps.db, 'customers');
  const digitWhere = deps.where('whatsAppDigits', '==', whatsAppDigits);
  const countryWhere = deps.where('countryCode', '==', countryCode);
  const constraints = [digitWhere, countryWhere];
  if (typeof deps.limit === 'function') {
    const limitSize = excludeId ? 2 : 1;
    constraints.push(deps.limit(limitSize));
  }
  const dupQuery = deps.query(customersRef, ...constraints);
  const snapshot = await deps.getDocs(dupQuery);

  if (!snapshot) return false;
  const docs = Array.isArray(snapshot.docs) ? snapshot.docs : [];
  if (!docs.length) return false;
  return docs.some((doc) => {
    const docId = doc?.id;
    if (excludeId && docId === excludeId) {
      return false;
    }
    return true;
  });
}

function attachSnapshotListener(listEl, deps, onChange) {
  if (
    !listEl ||
    typeof deps.onSnapshot !== 'function' ||
    typeof deps.collection !== 'function'
  )
    return null;

  const customersRef = deps.collection(deps.db, 'customers');
  const queryRef =
    typeof deps.query === 'function' && typeof deps.orderBy === 'function'
      ? deps.query(customersRef, deps.orderBy('name'))
      : customersRef;

  const unsubscribe = deps.onSnapshot(queryRef, (snapshot = { docs: [] }) => {
    const customers = buildCustomersFromDocs(snapshot.docs || []);
    if (typeof onChange === 'function') {
      onChange(customers);
    } else {
      renderCustomerList(listEl, customers);
    }
  });

  return typeof unsubscribe === 'function' ? unsubscribe : null;
}

function buildCustomersFromDocs(docs = []) {
  return docs.map((doc) => {
    const data = typeof doc.data === 'function' ? doc.data() : doc.data || {};
    return { id: doc.id, ...data };
  });
}

function renderCustomerList(listEl, customers = []) {
  if (!listEl) return;

  const sortedCustomers = [...customers].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (!nameA && nameB) return 1;
    if (nameA && !nameB) return -1;
    return nameA.localeCompare(nameB);
  });

  listEl.innerHTML = '';

  if (!sortedCustomers.length) {
    const emptyRow = document.createElement('li');
    emptyRow.textContent = 'No customers yet.';
    emptyRow.classList.add('muted');
    listEl.appendChild(emptyRow);
    return;
  }

  const fragment = document.createDocumentFragment();
  sortedCustomers.forEach((customer) => {
    const li = document.createElement('li');
    li.classList.add('customer-row');
    const name = customer.name || '(no name)';
    const detailParts = [];
    if (customer.location) detailParts.push(customer.location);
    if (customer.whatsApp) {
      detailParts.push(customer.whatsApp);
    } else if (customer.whatsAppDigits) {
      detailParts.push(customer.whatsAppDigits);
    }
    const title = document.createElement('span');
    title.textContent = detailParts.length
      ? `${name} — ${detailParts.join(' • ')}`
      : name;
    li.appendChild(title);

    if (customer.id) {
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.dataset.action = 'edit';
      editButton.dataset.customerId = customer.id;
      editButton.classList.add('text-button');
      li.appendChild(editButton);
    }

    fragment.appendChild(li);
  });

  listEl.appendChild(fragment);
}

function enterEditMode(customerId, refs, state) {
  if (!customerId || !state.customersById) return;
  const customer = state.customersById.get(customerId);
  if (!customer) return;

  if (refs.form) {
    refs.form.dataset.mode = 'edit';
  }
  if (refs.idInput) {
    refs.idInput.value = customerId;
  }
  refs.nameInput.value = customer.name || '';
  if (refs.addressInput) refs.addressInput.value = customer.address || '';
  if (refs.locationInput) refs.locationInput.value = customer.location || '';
  const whatsAppValue =
    customer.whatsApp ||
    (customer.countryCode && customer.whatsAppDigits
      ? `${customer.countryCode} ${customer.whatsAppDigits}`
      : customer.whatsAppDigits || '');
  refs.whatsAppInput.value = whatsAppValue;
  state.currentCustomerId = customerId;
  setMessage(refs.msgEl, 'Editing customer - save or cancel changes.');
}

function exitEditMode(refs, state) {
  if (refs.form?.dataset) {
    delete refs.form.dataset.mode;
  }
  state.currentCustomerId = null;
  resetForm(refs);
}

function resetForm(refs) {
  if (!refs.form) return;
  if (typeof refs.form.reset === 'function') {
    refs.form.reset();
  } else {
    refs.nameInput.value = '';
    if (refs.addressInput) refs.addressInput.value = '';
    if (refs.locationInput) refs.locationInput.value = '';
    refs.whatsAppInput.value = '';
  }
  if (refs.idInput) {
    refs.idInput.value = '';
  }
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
