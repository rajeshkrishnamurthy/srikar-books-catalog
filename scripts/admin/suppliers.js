export function initSupplierMaster({
  form,
  nameInput,
  locationInput,
  msgEl,
  listEl,
} = {}, firebaseDeps) {
  const deps = firebaseDeps || globalThis.__firebaseMocks?.exports;
  if (!deps) {
    throw new Error(
      'Supplier master requires Firebase dependencies (db, collection, addDoc, etc.).'
    );
  }
  const {
    db,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    where,
    getDocs,
  } = deps;

  const suppliersRef = collection(db, 'suppliers');
  const suppliersQuery = query(suppliersRef, orderBy('name'));
  let suppliers = [];

  const setMessage = (text, isError = false) => {
    if (!msgEl) return;
    msgEl.textContent = text;
    if (isError) msgEl.classList.add('error');
    else msgEl.classList.remove('error');
  };

  const renderList = () => {
    if (!listEl) return;
    const doc = listEl.ownerDocument || document;
    listEl.innerHTML = '';
    const sorted = [...suppliers].sort((a, b) => {
      const A = normalizeSupplierName(a.name).toLowerCase();
      const B = normalizeSupplierName(b.name).toLowerCase();
      return A.localeCompare(B);
    });
    if (!sorted.length) {
      const empty = doc.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'No suppliers yet.';
      listEl.appendChild(empty);
      return;
    }
    sorted.forEach((supplier) => {
      const li = doc.createElement('li');
      li.textContent = formatSupplierDisplay(supplier);
      listEl.appendChild(li);
    });
  };

  const unsubscribe = onSnapshot(
    suppliersQuery,
    (snap) => {
      suppliers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderList();
    },
    (err) => {
      console.error('suppliers snapshot error:', err);
      setMessage('Unable to load suppliers.', true);
    }
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const rawName = nameInput?.value ?? '';
    const rawLocation = locationInput?.value ?? '';
    const name = normalizeSupplierName(rawName);
    const location = normalizeSupplierName(rawLocation);
    const nameKey = makeSupplierKey(name);

    if (!name) {
      setMessage('Supplier name is required.', true);
      nameInput?.focus();
      return;
    }
    if (!location) {
      setMessage('Supplier location is required.', true);
      locationInput?.focus();
      return;
    }
    if (isDuplicateSupplierName(suppliers, name)) {
      setMessage('Duplicate supplier name. Enter a unique supplier.', true);
      nameInput?.focus();
      return;
    }

    try {
      setMessage('Saving…');
      if (await hasServerDuplicate(nameKey)) {
        setMessage('Duplicate supplier name. Enter a unique supplier.', true);
        nameInput?.focus();
        return;
      }
      const payload = buildSupplierPayload({
        name,
        location,
        nameKey,
        serverTimestamp,
      });
      await addDoc(suppliersRef, payload);
      form?.reset();
      setMessage('Supplier added.');
      nameInput?.focus();
    } catch (err) {
      console.error('supplier save error:', err);
      setMessage('Could not save supplier. Please try again.', true);
    }
  };

  const hasServerDuplicate = async (nameKey) => {
    if (!nameKey || !where || !getDocs) return false;
    try {
      const dupQuery = query(suppliersRef, where('nameKey', '==', nameKey));
      const snap = await getDocs(dupQuery);
      return Array.isArray(snap?.docs) && snap.docs.length > 0;
    } catch (err) {
      console.error('supplier duplicate check failed:', err);
      throw err;
    }
  };

  form?.addEventListener('submit', handleSubmit);

  return {
    dispose() {
      unsubscribe?.();
      form?.removeEventListener('submit', handleSubmit);
    },
  };
}

export function normalizeSupplierName(name = '') {
  return String(name).replace(/\s+/g, ' ').trim();
}

export function isDuplicateSupplierName(list = [], candidate = '') {
  const target = makeSupplierKey(candidate);
  if (!target) return false;
  return list.some(
    (supplier) => makeSupplierKey(supplier.name) === target
  );
}

export function formatSupplierDisplay(supplier = {}) {
  const name = normalizeSupplierName(supplier.name);
  const location = normalizeSupplierName(supplier.location);
  if (name && location) return `${name} — ${location}`;
  return name || location || '';
}

export function buildSupplierPayload({
  name = '',
  location = '',
  nameKey,
  serverTimestamp,
} = {}) {
  const normalizedName = normalizeSupplierName(name);
  const normalizedLocation = normalizeSupplierName(location);
  const stampFn = typeof serverTimestamp === 'function' ? serverTimestamp : null;
  const createdAt = stampFn ? stampFn() : undefined;
  const updatedAt = stampFn ? stampFn() : undefined;
  return {
    name: normalizedName,
    location: normalizedLocation,
    nameKey: nameKey || makeSupplierKey(normalizedName),
    createdAt,
    updatedAt,
  };
}

function makeSupplierKey(value = '') {
  return normalizeSupplierName(value).toLowerCase();
}
