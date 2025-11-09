export function initSupplierMaster(
  {
    form,
    nameInput,
    locationInput,
    msgEl,
    listEl,
    idInput,
    cancelBtn,
  } = {},
  firebaseDeps
) {
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
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    where,
    getDocs,
    limit,
  } = deps;

  const suppliersRef = collection(db, 'suppliers');
  const booksCollection = collection(db, 'books');
  const suppliersQuery = query(suppliersRef, orderBy('name'));
  let suppliers = [];
  let editingId = null;

  const setMessage = (text, isError = false) => {
    if (!msgEl) return;
    msgEl.textContent = text;
    if (isError) msgEl.classList.add('error');
    else msgEl.classList.remove('error');
  };

  const showCancel = (visible) => {
    if (!cancelBtn) return;
    cancelBtn.hidden = !visible;
  };

  const resetFormFields = () => {
    form?.reset();
    if (idInput) idInput.value = '';
    editingId = null;
    if (form?.dataset) {
      delete form.dataset.mode;
    }
    showCancel(false);
  };
  showCancel(false);

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
      li.dataset.id = supplier.id || '';
      const label = doc.createElement('span');
      label.textContent = formatSupplierDisplay(supplier);

      const actions = doc.createElement('span');
      actions.className = 'supplier-actions';

      const editBtn = doc.createElement('button');
      editBtn.type = 'button';
      editBtn.dataset.action = 'edit';
      editBtn.textContent = 'Edit';

      const deleteBtn = doc.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'btn-danger';

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(label);
      li.appendChild(actions);
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
    const isEditMode = form?.dataset.mode === 'edit' && !!editingId;

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
    if (isDuplicateSupplierName(suppliers, name, editingId)) {
      setMessage('Duplicate supplier name. Enter a unique supplier.', true);
      nameInput?.focus();
      return;
    }

    try {
      setMessage('Saving…');
      if (await hasServerDuplicate(nameKey, editingId)) {
        setMessage('Duplicate supplier name. Enter a unique supplier.', true);
        nameInput?.focus();
        return;
      }
      if (isEditMode) {
        const stampFn =
          typeof serverTimestamp === 'function' ? serverTimestamp : null;
        const ref = doc(db, 'suppliers', editingId);
        await updateDoc(ref, {
          name,
          location,
          nameKey,
          updatedAt: stampFn ? stampFn() : undefined,
        });
        setMessage('Supplier updated.');
      } else {
        const payload = buildSupplierPayload({
          name,
          location,
          nameKey,
          serverTimestamp,
        });
        await addDoc(suppliersRef, payload);
        setMessage('Supplier added.');
      }
      resetFormFields();
      nameInput?.focus();
    } catch (err) {
      console.error('supplier save error:', err);
      setMessage('Could not save supplier. Please try again.', true);
    }
  };

  const hasServerDuplicate = async (nameKey, excludeId = null) => {
    if (!nameKey || !where || !getDocs) return false;
    try {
      const dupQuery = query(suppliersRef, where('nameKey', '==', nameKey));
      const snap = await getDocs(dupQuery);
      if (!Array.isArray(snap?.docs)) return false;
      return snap.docs.some((docSnap) => docSnap.id !== excludeId);
    } catch (err) {
      console.error('supplier duplicate check failed:', err);
      throw err;
    }
  };

  const handleCancel = () => {
    resetFormFields();
    setMessage('');
  };

  const handleListClick = async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const li = btn.closest('li[data-id]');
    if (!li) return;
    const supplier = suppliers.find((s) => s.id === li.dataset.id);
    if (!supplier) return;
    const action = btn.dataset.action;
    if (action === 'edit') {
      startEdit(supplier);
    } else if (action === 'delete') {
      await handleDelete(supplier);
    }
  };

  form?.addEventListener('submit', handleSubmit);
  cancelBtn?.addEventListener('click', handleCancel);
  listEl?.addEventListener('click', handleListClick);

  return {
    dispose() {
      unsubscribe?.();
      form?.removeEventListener('submit', handleSubmit);
      cancelBtn?.removeEventListener('click', handleCancel);
      listEl?.removeEventListener('click', handleListClick);
    },
  };

  function startEdit(supplier) {
    editingId = supplier.id;
    if (form) form.dataset.mode = 'edit';
    if (idInput) idInput.value = supplier.id;
    if (nameInput) nameInput.value = supplier.name || '';
    if (locationInput) locationInput.value = supplier.location || '';
    showCancel(true);
    nameInput?.focus();
    setMessage('Editing supplier…');
  }

  async function handleDelete(supplier) {
    if (!supplier?.id) return;
    const shouldDelete =
      typeof confirm === 'function' ? confirm('Delete this supplier?') : true;
    if (!shouldDelete) return;
    try {
      setMessage('Checking usage…');
      if (await supplierHasBooks(supplier.id)) {
        setMessage('Supplier is in use by books; cannot delete.', true);
        return;
      }
      const ref = doc(db, 'suppliers', supplier.id);
      await deleteDoc(ref);
      setMessage('Supplier removed.');
      if (editingId === supplier.id) {
        resetFormFields();
      }
    } catch (err) {
      console.error('supplier delete error:', err);
      setMessage('Could not delete supplier. Please try again.', true);
    }
  }

  async function supplierHasBooks(supplierId) {
    if (!supplierId || !where || !getDocs) return false;
    try {
      const constraints = [where('supplierId', '==', supplierId)];
      if (typeof limit === 'function') {
        constraints.push(limit(1));
      }
      const usageQuery = query(booksCollection, ...constraints);
      const snap = await getDocs(usageQuery);
      return Array.isArray(snap?.docs) && snap.docs.length > 0;
    } catch (err) {
      console.error('supplier usage check failed:', err);
      throw err;
    }
  }
}

export function normalizeSupplierName(name = '') {
  return String(name).replace(/\s+/g, ' ').trim();
}

export function isDuplicateSupplierName(list = [], candidate = '', excludeId = null) {
  const target = makeSupplierKey(candidate);
  if (!target) return false;
  return list.some(
    (supplier) => supplier.id !== excludeId && makeSupplierKey(supplier.name) === target
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
  serverTimestamp = () => undefined,
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
