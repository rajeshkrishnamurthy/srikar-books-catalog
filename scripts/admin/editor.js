// Intent: Provide a small editor overlay to update a book's fields,
// optionally replace cover and append more images.
// Keeps existing extra images; we can add per-image delete later.

import {
  db,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from '../lib/firebase.js';
import {
  normalizeAuthorName,
  authorKeyFromName,
  onlyDigitsX,
} from '../helpers/data.js';
import { stripHtmlAndSquash } from '../helpers/text.js';

// --- Auto-price for EDIT form (mirrors add-form logic) ---
const EDIT_DISCOUNT = {
  'Good as new': 0.4,
  Excellent: 0.4,
  'Gently used': 0.5,
  Used: 0.6,
};

function bindEditAutoPrice(form) {
  const mrpEl = form.elements['emrp'];
  const condEl = form.elements['econdition'];
  const priceEl = form.elements['eprice'];
  if (!mrpEl || !condEl || !priceEl) return () => {};

  function recompute() {
    // Respect manual edits: once user types a price, don't overwrite it
    if (priceEl.dataset.manual === '1') return;
    const mrp = parseInt(mrpEl.value, 10);
    const d = EDIT_DISCOUNT[condEl.value];
    if (!Number.isNaN(mrp) && d != null) {
      const computed = Math.max(1, Math.round(mrp * (1 - d))); // discount off MRP
      priceEl.value = String(computed);
    }
  }
  condEl.addEventListener('change', recompute);
  mrpEl.addEventListener('input', recompute);
  priceEl.addEventListener('input', () => {
    priceEl.dataset.manual = '1';
  });

  return recompute;
}

export function initEditor() {
  const dlg = document.getElementById('editDialog');
  const form = document.getElementById('editForm');
  const msgEl = document.getElementById('editMsg');
  const coverInput = document.getElementById('editCoverInput');
  const moreInput = document.getElementById('editMoreInput');
  const coverPreview = document.getElementById('editCoverPreview');
  const cancelBtn = document.getElementById('editCancelBtn');

  let currentId = null;
  let currentData = null;

  function showPreviewFromUrl(url) {
    coverPreview.textContent = '';
    if (!url) {
      coverPreview.textContent = 'No cover.';
      return;
    }
    const img = new Image();
    img.src = url;
    img.alt = 'Cover preview';
    img.style.width = '96px';
    img.style.height = '144px';
    img.style.objectFit = 'contain';
    img.style.background = '#1f2329';
    img.style.border = '1px solid var(--border)';
    img.style.borderRadius = '8px';
    coverPreview.appendChild(img);
  }

  function showPreviewFromFile(file) {
    coverPreview.textContent = '';
    if (!file) {
      coverPreview.textContent = 'No cover selected.';
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.alt = 'Cover preview';
    img.onload = () => URL.revokeObjectURL(url);
    img.style.width = '96px';
    img.style.height = '144px';
    img.style.objectFit = 'contain';
    img.style.background = '#1f2329';
    img.style.border = '1px solid var(--border)';
    img.style.borderRadius = '8px';
    coverPreview.appendChild(img);
  }

  coverInput?.addEventListener('change', () =>
    showPreviewFromFile(coverInput.files?.[0])
  );
  cancelBtn?.addEventListener('click', () => dlg.close());

  async function load(id, data) {
    currentId = id;
    currentData = data || (await getDoc(doc(db, 'books', id))).data();

    // Fill fields
    form.elements['id'].value = id;
    form.elements['etitle'].value = currentData.title || '';
    form.elements['eauthor'].value = currentData.author || '';
    form.elements['ecategory'].value = currentData.category || '';
    form.elements['ebinding'].value = currentData.binding || '';
    form.elements['eprice'].value = currentData.price ?? '';
    form.elements['emrp'].value = currentData.mrp ?? '';
    form.elements['eisbn'].value = currentData.isbn || '';
    form.elements['econdition'].value = currentData.condition || '';
    form.elements['edescription'].value = currentData.description || '';

    const recompute = bindEditAutoPrice(form);
    recompute(); // compute once based on current MRP+Condition

    // Preview current cover
    const coverUrl =
      Array.isArray(currentData.images) && currentData.images[0]
        ? currentData.images[0]
        : '';
    showPreviewFromUrl(coverUrl);

    // Clear file inputs
    form.reset; // no-op for safety; we'll explicitly clear below
    if (coverInput) coverInput.value = '';
    if (moreInput) moreInput.value = '';

    dlg.showModal();
  }

  async function save(e) {
    e.preventDefault();
    msgEl.textContent = 'Saving…';

    const id = form.elements['id'].value;
    const refDoc = doc(db, 'books', id);

    // Read existing fresh to avoid races
    const snap = await getDoc(refDoc);
    const existing = snap.data() || {};
    const images = Array.isArray(existing.images)
      ? existing.images.slice()
      : [];
    const imagePaths = Array.isArray(existing.imagePaths)
      ? existing.imagePaths.slice()
      : [];

    // Fields
    const title = (form.elements['etitle'].value || '').trim();
    const authorRaw = form.elements['eauthor'].value || '';
    const author = normalizeAuthorName(authorRaw);
    const authorKey = author ? authorKeyFromName(author) : null;
    const category = form.elements['ecategory'].value || '';
    const binding = form.elements['ebinding'].value || '';
    const price = form.elements['eprice'].value
      ? parseInt(form.elements['eprice'].value, 10)
      : null;
    const mrp = form.elements['emrp'].value
      ? parseInt(form.elements['emrp'].value, 10)
      : null;
    const isbn = onlyDigitsX(form.elements['eisbn'].value || '');
    const condition = form.elements['econdition'].value || '';
    const descRaw = (form.elements['edescription'].value || '').toString();
    const description = stripHtmlAndSquash(descRaw).slice(0, 5000);

    // Base fields update
    const patch = {
      title,
      author,
      authorKey,
      category,
      binding,
      price,
      mrp,
      isbn,
      condition,
      description,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(refDoc, patch);

    // Upsert author master
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

    // Replace cover if provided
    if (coverInput?.files?.length) {
      const file = coverInput.files[0];
      const coverPath = `images/books/${id}/cover-${Date.now()}-${file.name}`;
      const coverRef = ref(storage, coverPath);
      await uploadBytes(coverRef, file);
      const coverUrl = await getDownloadURL(coverRef);

      // Delete old cover (index 0) if we had one
      const oldCoverPath = imagePaths[0];
      const newImages = [coverUrl, ...images.slice(1)];
      const newPaths = [coverPath, ...imagePaths.slice(1)];
      await updateDoc(refDoc, {
        images: newImages,
        imagePaths: newPaths,
        updatedAt: serverTimestamp(),
      });

      if (oldCoverPath) {
        try {
          await deleteObject(ref(storage, oldCoverPath));
        } catch {}
      }
    }

    // Append more images (optional)
    if (moreInput?.files?.length) {
      const fresh = (await getDoc(refDoc)).data() || {};
      const baseImages = Array.isArray(fresh.images)
        ? fresh.images.slice()
        : [];
      const basePaths = Array.isArray(fresh.imagePaths)
        ? fresh.imagePaths.slice()
        : [];

      const addUrls = [];
      const addPaths = [];
      for (const file of moreInput.files) {
        const p = `images/books/${id}/img-${Date.now()}-${file.name}`;
        const r = ref(storage, p);
        await uploadBytes(r, file);
        addUrls.push(await getDownloadURL(r));
        addPaths.push(p);
      }
      await updateDoc(refDoc, {
        images: [...baseImages, ...addUrls],
        imagePaths: [...basePaths, ...addPaths],
        updatedAt: serverTimestamp(),
      });
    }

    msgEl.textContent = 'Saved.';
    setTimeout(() => (msgEl.textContent = ''), 1200);
    dlg.close();
  }

  form?.addEventListener('submit', save);

  return {
    open: (id, data) => load(id, data),
  };
}
