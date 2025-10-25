// Intent: keep public request capture independent of catalog rendering.
import { db, addDoc, collection, serverTimestamp } from '../lib/firebase.js';
import { requestMessage, waLink } from '../lib/wa.js';

export function initRequestForm() {
  const form = document.getElementById('requestForm');
  if (!form) return;

  const reqMsg = document.getElementById('reqMsg');
  const reqWaLink = document.getElementById('reqWaLink');

  function compact(s=''){ return String(s).replace(/\s+/g,' ').trim(); }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (reqMsg) reqMsg.textContent = '';
    if (reqWaLink) reqWaLink.style.display = 'none';

    const fd = new FormData(form);
    const title  = compact((fd.get('rtitle')  || '').toString());
    const author = compact((fd.get('rauthor') || '').toString());
    const name   = compact((fd.get('rname')   || '').toString());
    const phone  = compact((fd.get('rphone')  || '').toString()).replace(/[^\d+]/g,'');
    const notes  = compact((fd.get('rnotes')  || '').toString());

    if (!title || !author || !name || !phone) {
      if (reqMsg) reqMsg.textContent = 'Please fill Title, Author, Your name and Phone.';
      return;
    }

    const text = requestMessage({
      title, author, notes,
      contact: [name, phone].filter(Boolean).join(' · ')
    });
    const wa = waLink(text);

    try {
      await addDoc(collection(db, 'requests'), {
        title, author, binding: '', notes,
        contactName: name, contactPhone: phone,
        status: 'open',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      if (reqMsg) reqMsg.textContent = 'Saved. You can now send the WhatsApp message.';
      if (reqWaLink) { reqWaLink.href = wa; reqWaLink.style.display = 'inline-block'; }
      try { window.open(wa, '_blank'); } catch {}
      form.reset();
    } catch (err) {
      console.error(err);
      if (reqMsg) reqMsg.textContent = 'Could not save your request. Please try again.';
    }
  });
}
