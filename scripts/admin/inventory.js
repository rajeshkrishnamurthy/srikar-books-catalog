// scripts/admin/inventory.js
// Intent: Inventory lists + row actions (sold/available/delete/edit/feature) + ADD BOOK submit wiring.

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

// Local helpers (avoid extra imports)
function normalizeAuthorName(str = '') {
  return String(str)
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
function authorKeyFromName(str = '') {
  const base = normalizeAuthorName(str)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return base.replace(/ /g, '-').slice(0, 100);
}
function onlyDigitsX(v = '') {
  return (v || '').toString().replace(/[^\dxX]/g, '');
}

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

// PUBLIC API
export function initInventory({
  addForm,
  addMsg,
  authorInput, // kept for consistency; not used here
  authorList, // kept for consistency; not used here
  availList,
  soldList,
  onEdit, // optional: editor.open
}) {
  // ---- ADD BOOK: submit handler (prevents full page reload) ----
  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (addMsg) addMsg.textContent = 'Uploading…';

    const fd = new FormData(addForm);
    const title = (fd.get('title') || '').toString().trim();
    const author = normalizeAuthorName((fd.get('author') || '').toString());
    const authorKey = author ? authorKeyFromName(author) : null;
    const category = (fd.get('category') || '').toString();
    const binding = (fd.get('binding') || '').toString();
    const price = fd.get('price') ? parseInt(fd.get('price'), 10) : null;
    const mrp = fd.get('mrp') ? parseInt(fd.get('mrp'), 10) : null;
    const isbn = onlyDigitsX(fd.get('isbn') || '');
    const condition = (fd.get('condition') || '').toString();
    const descRaw = (fd.get('description') || '').toString();
    const description = stripHtmlAndSquash(descRaw).slice(0, 5000);
    const featured = !!fd.get('featured'); // checkbox name="featured"

    const cover = fd.get('cover');
    const more = fd.getAll('more').filter((f) => f && f.size);

    if (!title || !category || !binding || !cover || !cover.size) {
      if (addMsg)
        addMsg.textContent =
          'Please fill the required fields (Title, Category, Format, Cover).';
      return;
    }

    try {
      // 1) Create book doc (get ID)
      const res = await addDoc(collection(db, 'books'), {
        title,
        author,
        authorKey,
        category,
        binding,
        isbn,
        price,
        mrp,
        condition,
        description,
        status: 'available',
        featured,
        ...(featured ? { featuredAt: serverTimestamp() } : {}),
        images: [],
        imagePaths: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const bookId = res.id;

      // 2) Upsert author master (for autocomplete)
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

      // 3) Upload cover
      const coverPath = `images/books/${bookId}/cover-${Date.now()}-${
        cover.name
      }`;
      const coverRef = ref(storage, coverPath);
      await uploadBytes(coverRef, cover);
      const coverUrl = await getDownloadURL(coverRef);

      // 4) Upload more images (optional)
      const moreUrls = [];
      const morePaths = [];
      for (const file of more) {
        const p = `images/books/${bookId}/img-${Date.now()}-${file.name}`;
        const r = ref(storage, p);
        await uploadBytes(r, file);
        moreUrls.push(await getDownloadURL(r));
        morePaths.push(p);
      }

      // 5) Patch doc with image URLs/paths
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
  });

  // ---- Lists: Available ----
  const qAvail = query(
    collection(db, 'books'),
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  );
  onSnapshot(qAvail, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const map = new Map(docs.map((d) => [d.id, d]));
    availList.innerHTML =
      docs.map((d) => rowHTML(d.id, d, false)).join('') ||
      '<p class="muted">No available books.</p>';
    wireRowButtons(availList, map, onEdit);
  });

  // ---- Lists: Sold ----
  const qSold = query(
    collection(db, 'books'),
    where('status', '==', 'sold'),
    orderBy('updatedAt', 'desc')
  );
  onSnapshot(qSold, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const map = new Map(docs.map((d) => [d.id, d]));
    soldList.innerHTML =
      docs.map((d) => rowHTML(d.id, d, true)).join('') ||
      '<p class="muted">No sold books.</p>';
    wireRowButtons(soldList, map, onEdit);
  });
}
