// Intent: manage the queue of incoming book requests from the public catalog.
import { db, collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, serverTimestamp } from '../lib/firebase.js';
import { escapeHtml } from '../helpers/text.js';

export function initRequests({ reqOpen, reqClosed }){
  const qOpen = query(collection(db, 'requests'), where('status','in',['open','contacted']), orderBy('createdAt','desc'));
  onSnapshot(qOpen, (snap) => {
    reqOpen.innerHTML = snap.docs.map(d => reqRowHTML(d.id, d.data())).join('') || '<p class="muted">No open requests.</p>';
    wireReqButtons(reqOpen);
  });

  const qClosed = query(collection(db, 'requests'), where('status','in',['fulfilled','closed','unfulfilled']), orderBy('updatedAt','desc'));
  onSnapshot(qClosed, (snap) => {
    reqClosed.innerHTML = snap.docs.map(d => reqRowHTML(d.id, d.data(), true)).join('') || '<p class="muted">No closed requests.</p>';
    wireReqButtons(reqClosed);
  });
}

function reqRowHTML(id, r, closed=false){
  const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
  return `
  <article class="row row--request" data-id="${id}">
    <div class="row-meta">
      <strong>${r.title ? escapeHtml(r.title) : '(untitled)'}</strong>
      <div class="muted">
        ${r.author ? escapeHtml(r.author) : 'Author: Any'}
        · ${r.binding || 'Any'}
        ${when ? ` · ${when}` : ''}
        ${(r.contactName || r.contactPhone || r.contactEmail)
          ? ' · ' + escapeHtml([r.contactName, r.contactPhone, r.contactEmail].filter(Boolean).join(' · '))
          : ''}
      </div>
      ${r.notes ? `<div class="muted">${escapeHtml(r.notes)}</div>` : ''}
    </div>
    <div class="row-actions">
      ${closed ? `
        <button data-action="reopen" class="btn btn-secondary">Reopen</button>
        <button data-action="delete" class="btn btn-danger">Delete</button>
      ` : `
        <button data-action="contacted" class="btn">Mark contacted</button>
        <button data-action="fulfilled" class="btn">Mark fulfilled</button>
        <button data-action="unfulfilled" class="btn btn-danger">Could not fulfill</button>
        <button data-action="close" class="btn btn-secondary">Close</button>
      `}
    </div>
  </article>`;
}

function wireReqButtons(container){
  container.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.row');
      const id = row.dataset.id;
      const action = btn.dataset.action;
      const refDoc2 = doc(db, 'requests', id);
      try {
        if (action === 'contacted') {
          await updateDoc(refDoc2, { status: 'contacted', updatedAt: serverTimestamp() });
        } else if (action === 'fulfilled') {
          await updateDoc(refDoc2, { status: 'fulfilled', updatedAt: serverTimestamp() });
        } else if (action === 'close') {
          await updateDoc(refDoc2, { status: 'closed', updatedAt: serverTimestamp() });
        } else if (action === 'reopen') {
          await updateDoc(refDoc2, { status: 'open', updatedAt: serverTimestamp() });
        } else if (action === 'delete') {
          if (!confirm('Delete this request?')) return;
          await deleteDoc(refDoc2);
        } else if (action === 'unfulfilled') {
          await updateDoc(refDoc2, { status: 'unfulfilled', updatedAt: serverTimestamp() });
        }
      } catch (err) {
        console.error(err);
        alert('Could not update this request: ' + err.message);
      }
    });
  });
}
