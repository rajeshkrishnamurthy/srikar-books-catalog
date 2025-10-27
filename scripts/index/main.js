// scripts/index/main.js
// Cost-aware catalog glue:
// - Grid = category by default; site-wide when searching.
// - Carousel = category-scoped, but PAUSED while searching or offline.
// - Don't "query" Firestore when term is short (<3), identical to last, or offline.
// - Debounce input so we don't churn subscriptions/renders.

import { subscribeToAllAvailable } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const carouselSection = document.getElementById('homeCarousel'); // exists in index.html

// --- state
let activeCategory = 'Fiction';
let unsubAll = null;
let cachedDocs = []; // site-wide (status == 'available')
let online = navigator.onLine;
let lastTerm = ''; // identical-term guard
let debounceId = 0; // debounce

// --- helpers
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
function hideCarousel(show) {
  if (!carouselSection) return;
  carouselSection.hidden = !show;
  carouselSection.setAttribute('aria-hidden', show ? 'false' : 'true');
}

/**
 * Render the grid + (un)pause the carousel in a cost-aware way:
 * - If searching with matches (and term >=3): hide & pause carousel.
 * - If short term (<3), identical term, or offline: don't touch the carousel subscription;
 *   for offline we keep it paused (set in the online/offline listeners).
 */
function updateView() {
  const rawTerm = searchInput?.value || '';
  const t = norm(rawTerm);

  // identical-term (no work)
  if (t === lastTerm) return;
  lastTerm = t;

  const searching = hasMinLen(rawTerm);
  const matches = searching ? filterBySearch(cachedDocs, rawTerm) : [];

  // Decide which docs to show
  const docsToRender = searching
    ? matches
    : filterByCategory(cachedDocs, activeCategory);

  // Grid render (we already filtered; pass searchTerm='')
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: docsToRender,
    searchTerm: '',
  });

  // Carousel visibility + subscription policy
  if (searching && matches.length > 0) {
    // We have results → give them priority; pause carousel query
    hideCarousel(false);
    setCarouselCategory(null); // special: don't query Firestore at all (see catalogService)
  } else if (!online) {
    // Offline → keep it paused; results come from cache
    hideCarousel(false);
    setCarouselCategory(null);
  } else {
    // Default view → show & (re)subscribe carousel for active category
    hideCarousel(true);
    setCarouselCategory(activeCategory);
  }
}

// Debounce the keystrokes (UI + subscription churn)
function debouncedUpdate() {
  clearTimeout(debounceId);
  debounceId = setTimeout(updateView, 300);
}

// Tabs: just update the category and re-render
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  // If we are *not* actively searching (term < 3), switch the category view immediately
  if (!hasMinLen(searchInput?.value || '')) {
    setCarouselCategory(activeCategory);
    updateView();
  }
});

// Search: debounced
searchInput?.addEventListener('input', () => {
  // Short terms (<3) → treat like "no search", show category view, *do not* resume carousel if offline.
  if (!hasMinLen(searchInput.value || '')) {
    // Reset lastTerm so we re-render when term grows to >=3 later
    lastTerm = '__short__' + Math.random();
  }
  debouncedUpdate();
});

// Online/offline: pause carousel entirely while offline
window.addEventListener('online', () => {
  online = true;
  // If not actively searching, resume carousel for the current category
  if (!hasMinLen(searchInput?.value || '')) setCarouselCategory(activeCategory);
  updateView();
});
window.addEventListener('offline', () => {
  online = false;
  setCarouselCategory(null); // hard pause
  updateView();
});

// Subscribe once to site‑wide availability (no keystroke queries)
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

// Boot
initCarousel(activeCategory);
subscribeAll();
