// Intent: minimal glue that wires auth, lookup, auto-pricing, inventory, and requests.
import { settings } from '../config.js';
import { initAuth } from './auth.js';
import { bindAutoPrice } from './autoPrice.js';
import { wireLookup } from './lookup.js';
import { initInventory } from './inventory.js';
import { initRequests } from './requests.js';
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
const authorInput = document.getElementById('authorInput');
const authorList = document.getElementById('authorList');
const lookupBtn = document.getElementById('lookupBtn');
const lookupMsg = document.getElementById('lookupMsg');
const lookupResults = document.getElementById('lookupResults');
const coverInput = document.getElementById('coverInput');
const availList = document.getElementById('availList');
const soldList = document.getElementById('soldList');
const reqOpen = document.getElementById('reqOpen');
const reqClosed = document.getElementById('reqClosed');

// --- Authors datalist subscription (single definition) ---
function subscribeAuthors() {
  const qAuthors = query(collection(db, 'authors'), orderBy('name'));
  onSnapshot(
    qAuthors,
    (snap) => {
      // dedupe ignoring case; turn into <option> list
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

    // 2) Wire the rest of the admin app
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

    // (Note: no need to pass subscribeAuthors to initInventory)
    initInventory({
      addForm,
      addMsg,
      authorInput,
      authorList,
      availList,
      soldList,
    });

    initRequests({ reqOpen, reqClosed });
  },
});
