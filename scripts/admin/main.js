// Intent: minimal glue that wires auth, lookup, auto-pricing, inventory, requests, and editor.
import { settings } from '../config.js';
import { initAuth } from './auth.js';
import { bindAutoPrice } from './autoPrice.js';
import { wireLookup } from './lookup.js';
import { initInventory } from './inventory.js';
import { initRequests } from './requests.js';
import { initEditor } from './editor.js';
import { db, collection, query, orderBy, onSnapshot } from '../lib/firebase.js';
import { escapeHtml } from '../helpers/text.js';

// Elements
const authEl = document.getElementById('auth');
const adminEl = document.getElementById('admin');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('authError');
const signOutBtn = document.getElementById('signOutBtn');

const addForm = document.getElementById('addForm');
const addMsg = document.getElementById('addMsg');
const authorInput = document.getElementById('authorInput'); // add form's author input (with datalist)
const authorList = document.getElementById('authorList');
const lookupBtn = document.getElementById('lookupBtn');
const lookupMsg = document.getElementById('lookupMsg');
const lookupResults = document.getElementById('lookupResults');
const coverInput = document.getElementById('coverInput');
const availList = document.getElementById('availList');
const soldList = document.getElementById('soldList');
const reqOpen = document.getElementById('reqOpen');
const reqClosed = document.getElementById('reqClosed');
const searchCoverBtn = document.getElementById('searchCoverBtn');
const coverPreviewEl = document.getElementById('coverPreview');

// --- Authors datalist subscription (single definition) ---
function subscribeAuthors() {
  const qAuthors = query(collection(db, 'authors'), orderBy('name'));
  onSnapshot(
    qAuthors,
    (snap) => {
      const seen = new Set();
      const opts = [];
      for (const d of snap.docs) {
        const name = String(d.data().name || '');
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        opts.push(`<option value="${escapeHtml(name)}"></option>`);
      }
      authorList.innerHTML = opts.join('');
    },
    (err) => console.error('authors onSnapshot error:', err)
  );
}

initAuth({
  authEl,
  adminEl,
  loginForm,
  emailInput,
  passwordInput,
  authError,
  signOutBtn,
  onAuthed() {
    // 1) Start the realtime <datalist> fill for Author autocomplete
    subscribeAuthors();

    // 2) Wire cover preview for Add form
    function updateCoverPreview() {
      if (!coverPreviewEl) return;
      coverPreviewEl.textContent = '';
      const file = coverInput?.files?.[0];
      if (!file) {
        coverPreviewEl.textContent = 'No cover selected.';
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.alt = 'Cover preview';
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      img.style.width = '96px';
      img.style.height = '144px';
      img.style.objectFit = 'contain';
      img.style.background = '#1f2329';
      img.style.border = '1px solid var(--border)';
      img.style.borderRadius = '8px';
      coverPreviewEl.appendChild(img);
    }
    coverInput?.addEventListener('change', updateCoverPreview);
    addForm?.addEventListener('reset', () => setTimeout(updateCoverPreview, 0));

    // 3) Lookup + autoPrice on Add form
    const autoPrice = bindAutoPrice(addForm);
    wireLookup({
      addForm,
      authorInput,
      coverInput,
      btn: lookupBtn,
      msgEl: lookupMsg,
      resultsEl: lookupResults,
      autoPrice,
      apiKey: settings.googleBooksApiKey || '',
    });

    // 4) Editor + Inventory (PASS addForm/addMsg/etc so submit is wired)
    const editor = initEditor();
    initInventory({
      addForm,
      addMsg,
      authorInput,
      authorList,
      availList,
      soldList,
      onEdit: editor.open,
    });

    // Wire admin search
    const adminSearch = document.getElementById('adminSearch');
    adminSearch?.addEventListener('input', () => {
      inventory.setFilter(adminSearch.value);
    });

    // 5) Requests panel
    initRequests({ reqOpen, reqClosed });
  },
});

// ---- Search cover image helper ----
function openCoverSearch() {
  const title = (addForm.elements['title']?.value || '').trim();
  const author = (addForm.elements['author']?.value || '').trim();
  const binding = (addForm.elements['binding']?.value || '').trim();
  const isbn = (addForm.elements['isbn']?.value || '').trim();
  if (!title) {
    alert('Enter a Title first, then click Search cover image.');
    return;
  }
  const parts = [`"${title}"`];
  if (author) parts.push(author);
  if (binding) parts.push(binding);
  parts.push('book cover');
  if (isbn) parts.push(isbn);
  const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    parts.join(' ')
  )}`;
  window.open(url, '_blank', 'noopener');
}
searchCoverBtn?.addEventListener('click', openCoverSearch);
