// scripts/admin/inventory.js
// Intent: Inventory lists + row actions (sold/available/delete/edit/feature) + ADD BOOK submit wiring,
//         now with fast client-side filtering exposed via setFilter(term).

import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from '../lib/firebase.js';
import { stripHtmlAndSquash } from '../helpers/text.js';
import { bookMatchesQuery } from '../helpers/bookSearch.js';
import { readCurrencyField } from './currency.js';

// ---- small utils ----
const norm = (s = '') => String(s).toLowerCase();
const onlyDigitsX = (v = '') => (v || '').toString().replace(/[^\dxX]/g, '');
const normalizeAuthorName = (str = '') =>
  String(str)
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
const authorKeyFromName = (str = '') =>
  normalizeAuthorName(str)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '-')
    .slice(0, 100);

function formatSupplierLabel(supplier = {}) {
  const name = normalizeAuthorName(supplier.name || '');
  const location = normalizeAuthorName(supplier.location || '');
  return location ? `${name} — ${location}` : name;
}

const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN');

function formatPurchasePriceText(value) {
  if (value === undefined || value === null || value === '') {
    return 'Purchase price: Not set';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'Purchase price: Not set';
  }
  const formatted = RUPEE_FORMATTER.format(Math.round(numeric));
  return `Purchase price: ₹${formatted}`;
}

function matches(doc, term) {
  return bookMatchesQuery(
    {
      title: doc.title,
      author: doc.author,
      isbn: doc.isbn,
    },
    term
  );
}

// ---- row rendering ----
function rowHTML(id, b, sold = false) {
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  const price = b.price ? ` · ₹${b.price}` : '';
  const mrp = b.mrp ? ` · MRP ₹${b.mrp}` : '';
  const isbn = b.isbn ? ` · ISBN ${b.isbn}` : '';
  const featuredPill = b.featured
    ? ` <span class="pill" title="Shown on homepage">★ Featured</span>`
    : '';
  const featureBtn = b.featured
    ? `<button data-action="unfeature" class="btn btn-secondary">Unfeature</button>`
    : `<button data-action="feature" class="btn">Feature</button>`;

  return `
<article class="row" data-id="${id}">
  <img src="${img}" alt="" />
  <div class="row-meta">
    <strong>${(b.title || '').replace(/</g, '&lt;')}${featuredPill}</strong>
    <div class="muted">
      ${b.author || ''} · ${b.category || ''} · ${
    b.binding || ''
  }${price}${mrp}${isbn}
    </div>
    <div class="purchase-price muted">${formatPurchasePriceText(
      b.purchasePrice
    )}</div>
  </div>
  <div class="row-actions">
    ${featureBtn}
    <button data-action="edit" class="btn btn-secondary">Edit</button>
    ${
      sold
        ? `<button data-action="available" class="btn">Mark available</button>`
        : `<button data-action="sold" class="btn">Mark sold</button>`
    }
    <button data-action="delete" class="btn btn-danger">Delete</button>
  </div>
</article>`;
}

function wireRowButtons(container, docsMap, onEdit) {
  container.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.row');
      const id = row.dataset.id;
      const action = btn.dataset.action;
      const refDoc = doc(db, 'books', id);

      if (action === 'edit') {
        onEdit && onEdit(id, docsMap.get(id));
        return;
      }
      if (action === 'feature') {
        await updateDoc(refDoc, {
          featured: true,
          featuredAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'unfeature') {
        await updateDoc(refDoc, {
          featured: false,
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'sold') {
        await updateDoc(refDoc, {
          status: 'sold',
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'available') {
        await updateDoc(refDoc, {
          status: 'available',
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (action === 'delete') {
        if (!confirm('Delete this book permanently? This also deletes images.'))
          return;
        const snap = await getDoc(refDoc);
        const data = snap.data();
        if (data && Array.isArray(data.imagePaths)) {
          for (const p of data.imagePaths) {
            try {
              await deleteObject(ref(storage, p));
            } catch {}
          }
        }
        await deleteDoc(refDoc);
      }
    });
  });
}

// ---- public API ----
export function initInventory({
  addForm,
  addMsg,
  availList,
  soldList,
  supplierSelect,
  onEdit, // optional
}) {
  let supplierEntries = [];
  let supplierIds = new Set();

  function syncSuppliers(list = []) {
    supplierEntries = (Array.isArray(list) ? list : [])
      .slice()
      .sort((a, b) =>
        formatSupplierLabel(a).localeCompare(formatSupplierLabel(b))
      );
    supplierIds = new Set(supplierEntries.map((s) => s.id));
    const select = supplierSelect || addForm?.elements?.supplierId;
    if (!select) return;
    const docRef = select.ownerDocument || document;
    const currentValue = select.value;
    select.innerHTML = '';
    const placeholder = docRef.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Select supplier *';
    select.appendChild(placeholder);
    supplierEntries.forEach((supplier) => {
      const option = docRef.createElement('option');
      option.value = supplier.id;
      option.textContent = formatSupplierLabel(supplier);
      select.appendChild(option);
    });
    select.disabled = supplierEntries.length === 0;
    if (currentValue && supplierIds.has(currentValue)) {
      select.value = currentValue;
    } else {
      select.value = '';
    }
  }
  syncSuppliers();

  // ---- ADD BOOK: submit handler (unchanged) ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (addMsg) addMsg.textContent = 'Uploading…';

    const fd = new FormData(addForm);
    const title = (fd.get('title') || '').toString().trim();
    const author = normalizeAuthorName((fd.get('author') || '').toString());
    const authorKey = author ? authorKeyFromName(author) : null;
    const category = (fd.get('category') || '').toString();
    const binding = (fd.get('binding') || '').toString();
    const priceField = readCurrencyField(fd, 'price');
    const mrpField = readCurrencyField(fd, 'mrp');
    const purchaseField = readCurrencyField(fd, 'purchasePrice');
    const price = priceField.value;
    const mrp = mrpField.value;
    const purchasePrice = purchaseField.value;
    const isbn = onlyDigitsX(fd.get('isbn') || '');
    const condition = (fd.get('condition') || '').toString();
    const descRaw = (fd.get('description') || '').toString();
    const description = stripHtmlAndSquash(descRaw).slice(0, 5000);
    const featured = !!fd.get('featured');
    const supplierId = (fd.get('supplierId') || '').toString().trim();
    const cover = fd.get('cover');
    const more = fd.getAll('more').filter((f) => f && f.size);

    if (!title || !category || !binding || !cover || !cover.size) {
      if (addMsg)
        addMsg.textContent =
          'Please fill the required fields (Title, Category, Format, Cover).';
      return;
    }

    if (purchaseField.hasValue && !purchaseField.isNumeric) {
      if (addMsg)
        addMsg.textContent = 'Purchase price must be a numeric value.';
      return;
    }

    if (purchaseField.hasValue && purchasePrice < 0) {
      if (addMsg)
        addMsg.textContent = 'Purchase price must be zero or positive.';
      return;
    }

    if (!supplierId) {
      if (addMsg) addMsg.textContent = 'Please select a supplier.';
      return;
    }

    if (!supplierIds.has(supplierId)) {
      if (addMsg)
        addMsg.textContent =
          'Selected supplier is no longer available. Choose another supplier.';
      return;
    }

    try {
      const res = await addDoc(collection(db, 'books'), {
        title,
        author,
        authorKey,
        category,
        binding,
        isbn,
        price,
        mrp,
        purchasePrice,
        condition,
        description,
        status: 'available',
        featured,
        supplierId,
        ...(featured ? { featuredAt: serverTimestamp() } : {}),
        images: [],
        imagePaths: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const bookId = res.id;

      if (authorKey) {
        await setDoc(
          doc(db, 'authors', authorKey),
          {
            key: authorKey,
            name: author,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      const coverPath = `images/books/${bookId}/cover-${Date.now()}-${
        cover.name
      }`;
      const coverRef = ref(storage, coverPath);
      await uploadBytes(coverRef, cover);
      const coverUrl = await getDownloadURL(coverRef);

      const moreUrls = [],
        morePaths = [];
      for (const file of more) {
        const p = `images/books/${bookId}/img-${Date.now()}-${file.name}`;
        const r = ref(storage, p);
        await uploadBytes(r, file);
        moreUrls.push(await getDownloadURL(r));
        morePaths.push(p);
      }

      await updateDoc(res, {
        images: [coverUrl, ...moreUrls],
        imagePaths: [coverPath, ...morePaths],
        updatedAt: serverTimestamp(),
      });

      addForm.reset();
      if (addMsg) {
        addMsg.textContent = 'Added! It is now live in the catalog.';
        setTimeout(() => (addMsg.textContent = ''), 3000);
      }
    } catch (err) {
      console.error(err);
      if (addMsg) addMsg.textContent = 'Error: ' + err.message;
    }
  };

  addForm?.addEventListener('submit', handleSubmit);

  // ---- live lists + filtering ----
  let currentFilter = ''; // search text
  let availDocs = []; // latest available docs
  let soldDocs = []; // latest sold docs

  function renderLists() {
    const isSearching = !!currentFilter;
    const A = isSearching
      ? availDocs.filter((d) => matches(d, currentFilter))
      : availDocs;
    const S = isSearching
      ? soldDocs.filter((d) => matches(d, currentFilter))
      : soldDocs;

    // Available
    if (A.length) {
      const map = new Map(A.map((d) => [d.id, d]));
      availList.innerHTML = A.map((d) => rowHTML(d.id, d, false)).join('');
      wireRowButtons(availList, map, onEdit);
    } else {
      availList.innerHTML = `<p class="muted">${
        isSearching ? 'No matches in Available.' : 'No available books.'
      }</p>`;
    }

    // Sold
    if (S.length) {
      const map = new Map(S.map((d) => [d.id, d]));
      soldList.innerHTML = S.map((d) => rowHTML(d.id, d, true)).join('');
      wireRowButtons(soldList, map, onEdit);
    } else {
      soldList.innerHTML = `<p class="muted">${
        isSearching ? 'No matches in Sold.' : 'No sold books.'
      }</p>`;
    }
  }

  // snapshots (unchanged queries)
  const qAvail = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  const qSold = query(
    collection(db, 'books'),
    where('status', '==', 'sold'),
    orderBy('updatedAt', 'desc')
  );

  const unsubscribeAvail = onSnapshot(qAvail, (snap) => {
    availDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderLists();
  });
  const unsubscribeSold = onSnapshot(qSold, (snap) => {
    soldDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderLists();
  });

  // expose to main.js
  return {
    setFilter(term = '') {
      currentFilter = String(term).trim().toLowerCase();
      renderLists();
    },
    setSuppliers(list = []) {
      syncSuppliers(list);
    },
    dispose() {
      addForm?.removeEventListener('submit', handleSubmit);
      unsubscribeAvail?.();
      unsubscribeSold?.();
    },
  };
}
