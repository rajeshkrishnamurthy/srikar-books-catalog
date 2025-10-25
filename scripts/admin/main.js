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

// Authors datalist subscription (kept tiny here to avoid a full module)
function subscribeAuthors() {
  const qAuthors = query(collection(db, 'authors'), orderBy('name'));
  onSnapshot(
    qAuthors,
    (snap) => {
      const names = snap.docs
        .map((d) => (d.data().name || '').toString())
        .filter(Boolean);
      authorList.innerHTML = Array.from(new Set(names))
        .map((n) => `<option value="${escapeHtml(n)}"></option>`)
        .join('');
    },
    (err) => {
      console.error('authors onSnapshot error:', err);
    }
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
    // Once authed, wire the rest
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

    initInventory({
      addForm,
      addMsg,
      authorInput,
      authorList,
      availList,
      soldList,
      subscribeAuthors,
    });
    initRequests({ reqOpen, reqClosed });
  },
});
