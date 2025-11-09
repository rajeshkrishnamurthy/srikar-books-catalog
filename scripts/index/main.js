// Cost-aware catalog glue:
// - Grid = active category by default; site-wide when searching (>=3 chars).
// - Featured carousel = category-scoped; paused during search or offline.
// - Debounce input; skip “queries” for short terms; render always on data change.

import { subscribeToAllAvailable } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const carouselSection = document.getElementById('homeCarousel');

let activeCategory = 'Fiction';
let unsubAll = null;
let cachedDocs = []; // site-wide (status == 'available')
let online = navigator.onLine;
let debounceId = 0;

const norm = (s = '') => String(s).toLowerCase();
const hasMinLen = (s = '') => norm(s).trim().length >= 3;

function filterBySearch(docs, term) {
  const t = norm(term).trim();
  if (!t) return [];
  return docs.filter(
    (b) => norm(b.title || '').includes(t) || norm(b.author || '').includes(t)
  );
}
function filterByCategory(docs, category) {
  return docs.filter((b) => (b.category || '') === category);
}
function showCarousel(yes) {
  if (!carouselSection) return;
  carouselSection.hidden = !yes;
  carouselSection.setAttribute('aria-hidden', yes ? 'false' : 'true');
}

function updateView() {
  const term = searchInput?.value || '';
  const searching = hasMinLen(term);
  const matches = searching ? filterBySearch(cachedDocs, term) : [];

  const docsToRender = searching
    ? matches
    : filterByCategory(cachedDocs, activeCategory);

  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: docsToRender,
    searchTerm: '',
  });

  if ((searching && matches.length > 0) || !online) {
    showCarousel(false);
    setCarouselCategory(null);
  } else {
    showCarousel(true);
    setCarouselCategory(activeCategory);
  }
}

function debouncedUpdate() {
  clearTimeout(debounceId);
  debounceId = setTimeout(updateView, 300);
}

wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  if (!hasMinLen(searchInput?.value || '')) {
    setCarouselCategory(activeCategory);
    updateView();
  }
});

searchInput?.addEventListener('input', () => {
  debouncedUpdate();
});

window.addEventListener('online', () => {
  online = true;
  if (!hasMinLen(searchInput?.value || '')) setCarouselCategory(activeCategory);
  updateView();
});
window.addEventListener('offline', () => {
  online = false;
  setCarouselCategory(null);
  updateView();
});

// --- Optional header shortcut to scroll to the request form ---
document.getElementById('openRequestBtn')?.addEventListener('click', () => {
  const requestPanel = document.getElementById('requestPanel');
  if (!requestPanel) return;
  requestPanel.open = true;
  requestPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const first =
    requestPanel.querySelector('input[name="rtitle"]') ||
    requestPanel.querySelector('input, textarea, select');
  if (first) setTimeout(() => first.focus(), 300);
});

// Subscribe once to site‑wide books; render on every snapshot
function subscribeAll() {
  if (unsubAll) unsubAll();
  unsubAll = subscribeToAllAvailable(
    (docs) => {
      cachedDocs = docs;
      updateView();
    },
    (err) => {
      console.error(err);
      grid.innerHTML =
        '<p class="error">Could not load books. Check your Firestore rules and indexes.</p>';
    }
  );
}

// ---------------- Phone field: “+91 + 10 digits” enforcement ----------------
const requestForm = document.getElementById('requestForm');
const reqMsg = document.getElementById('reqMsg');
const reqWaLink = document.getElementById('reqWaLink');
const phoneInput = requestForm?.querySelector('input[name="rphone"]');

const digitsOnly = (s = '') => String(s).replace(/\D/g, '');
const isTenDigitPhone = (s = '') => /^[0-9]{10}$/.test(s);

function showReqError(msg) {
  if (!reqMsg) return;
  reqMsg.textContent = msg;
  reqMsg.classList.add('error');
  reqMsg.classList.remove('muted');
}
function clearReqError() {
  if (!reqMsg) return;
  reqMsg.textContent = '';
  reqMsg.classList.remove('error');
  reqMsg.classList.add('muted');
}

// Keep only digits (max 10) while typing
phoneInput?.addEventListener('input', () => {
  const v = digitsOnly(phoneInput.value).slice(0, 10);
  if (v !== phoneInput.value) phoneInput.value = v;
  phoneInput.setAttribute('aria-invalid', 'false');
  clearReqError();
});

// Block submit unless it’s exactly 10 digits (capture phase to gate early)
requestForm?.addEventListener(
  'submit',
  (e) => {
    if (!phoneInput) return;
    const digits = digitsOnly(phoneInput.value);
    if (!isTenDigitPhone(digits)) {
      e.preventDefault();
      e.stopImmediatePropagation?.();
      phoneInput.setAttribute('aria-invalid', 'true');
      if (reqWaLink) reqWaLink.style.display = 'none';
      showReqError(
        'Enter a 10‑digit Indian mobile number (no +91, no spaces).'
      );
      phoneInput.focus();
      phoneInput.select?.();
      return;
    }
    // Normalize to 10 digits for downstream code (saving, WhatsApp, etc.)
    phoneInput.value = digits;
    clearReqError();
  },
  true
);

// Boot
import { initCarousel as _ic } from './carousel.js'; // ensure tree-shake safe in some bundlers
initCarousel(activeCategory);
subscribeAll();
