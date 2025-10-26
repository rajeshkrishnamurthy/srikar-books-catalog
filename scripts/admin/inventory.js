// Intent: inventory list + row actions (sold/available/delete) + EDIT hook.
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  storage,
  ref,
  deleteObject,
} from '../lib/firebase.js';

function rowHTML(id, b, sold = false) {
  const img = (b.images && b.images[0]) || './assets/placeholder.webp';
  const price = b.price ? ` · ₹${b.price}` : '';
  const mrp = b.mrp ? ` · MRP ₹${b.mrp}` : '';
  const isbn = b.isbn ? ` · ISBN ${b.isbn}` : '';
  return `
<article class="row" data-id="${id}">
  <img src="${img}" alt="" />
  <div class="row-meta">
    <strong>${(b.title || '').replace(/</g, '&lt;')}</strong>
    <div class="muted">
      ${b.author || ''} · ${b.category || ''} · ${
    b.binding || ''
  }${price}${mrp}${isbn}
    </div>
  </div>
  <div class="row-actions">
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

export function initInventory({ availList, soldList, onEdit }) {
  // Available
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

  // Sold
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
