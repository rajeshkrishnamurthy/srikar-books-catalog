// Intent: all inventory operations: add book, list available/sold, row actions (sold/available/delete).
import {
  db, storage, collection, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc,
  serverTimestamp, ref, uploadBytes, getDownloadURL, deleteObject, query, where, orderBy, onSnapshot
} from '../lib/firebase.js';
import { normalizeAuthorName, authorKeyFromName, onlyDigitsX } from '../helpers/data.js';

export function initInventory({ addForm, addMsg, authorInput, authorList, availList, soldList, subscribeAuthors }){
  // Wire submit
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addMsg.textContent = 'Uploading…';

    const fd = new FormData(addForm);
    const title = (fd.get('title') || '').toString().trim();
    const authorRaw = (fd.get('author') || '').toString();
    const author = normalizeAuthorName(authorRaw);
    const authorKey = author ? authorKeyFromName(author) : null;
    const category = fd.get('category');
    const binding = fd.get('binding') || '';
    const price = fd.get('price') ? parseInt(fd.get('price'), 10) : null;
    const mrp   = fd.get('mrp')   ? parseInt(fd.get('mrp'), 10)   : null;
    const isbn  = onlyDigitsX(fd.get('isbn'));
    const condition = fd.get('condition') || '';
    const description = (fd.get('description') || '').toString().replace(/\s+/g,' ').trim();
    const cover = fd.get('cover');
    const more = fd.getAll('more').filter(f => f && f.size);

    if (!title || !category || !binding || !cover || !cover.size) {
      addMsg.textContent = 'Please fill the required fields (Title, Category, Format, Cover).';
      return;
    }

    try {
      const res = await addDoc(collection(db, 'books'), {
        title, author, authorKey, category, binding, isbn, price, mrp, condition, description,
        status: 'available',
        images: [], imagePaths: [],
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      const bookId = res.id;

      if (authorKey) {
        await setDoc(doc(db, 'authors', authorKey), {
          key: authorKey, name: author, updatedAt: serverTimestamp(), createdAt: serverTimestamp()
        }, { merge: true });
      }

      // Upload cover
      const coverFile = cover;
      const coverPath = `images/books/${bookId}/cover-${Date.now()}-${coverFile.name}`;
      const coverRef = ref(storage, coverPath);
      await uploadBytes(coverRef, coverFile);
      const coverUrl = await getDownloadURL(coverRef);

      // Upload more images (optional)
      const moreUrls = [];
      const morePaths = [];
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
        updatedAt: serverTimestamp()
      });

      addForm.reset();
      addMsg.textContent = 'Added! It is now live in the catalog.';
      setTimeout(() => (addMsg.textContent = ''), 3000);
    } catch (err) {
      console.error(err);
      addMsg.textContent = 'Error: ' + err.message;
    }
  });

  // Lists
  const qAvail = query(collection(db, 'books'), where('status', '==', 'available'), orderBy('createdAt', 'desc'));
  const qSold  = query(collection(db, 'books'), where('status', '==', 'sold'),      orderBy('updatedAt', 'desc'));

  onSnapshot(qAvail, (snap) => {
    availList.innerHTML = snap.docs.map(d => rowHTML(d.id, d.data())).join('') || '<p class="muted">No available books.</p>';
    wireRowButtons(availList);
  });
  onSnapshot(qSold, (snap) => {
    soldList.innerHTML = snap.docs.map(d => rowHTML(d.id, d.data(), true)).join('') || '<p class="muted">No sold books.</p>';
    wireRowButtons(soldList);
  });
}

function rowHTML(id, b, sold=false){
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  return `
  <article class="row" data-id="${id}">
    <img src="${img}" alt="" />
    <div class="row-meta">
      <strong>${(b.title || '').replace(/</g,'&lt;')}</strong>
      <div class="muted">
        ${b.author || ''} · ${b.category || ''} · ${b.binding || ''}
        ${b.price ? ' · ₹'+b.price : ''}${b.mrp ? ' · MRP ₹'+b.mrp : ''}${b.isbn ? ' · ISBN '+b.isbn : ''}
      </div>
    </div>
    <div class="row-actions">
      ${sold ? '<button data-action="available" class="btn btn-secondary">Mark available</button>' : '<button data-action="sold" class="btn">Mark sold</button>'}
      <button data-action="delete" class="btn btn-danger">Delete</button>
    </div>
  </article>`;
}

function wireRowButtons(container){
  container.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.row');
      const id = row.dataset.id;
      const action = btn.dataset.action;
      const refDoc2 = doc(db, 'books', id);
      if (action === 'sold') {
        await updateDoc(refDoc2, { status: 'sold', updatedAt: serverTimestamp() });
      } else if (action === 'available') {
        await updateDoc(refDoc2, { status: 'available', updatedAt: serverTimestamp() });
      } else if (action === 'delete') {
        if (!confirm('Delete this book permanently? This also deletes images.')) return;
        const snap = await getDoc(refDoc2);
        const data = snap.data();
        if (data && Array.isArray(data.imagePaths)) {
          for (const p of data.imagePaths) { try { await deleteObject(ref(storage, p)); } catch {} }
        }
        await deleteDoc(refDoc2);
      }
    });
  });
}
