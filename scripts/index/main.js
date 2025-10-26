// scripts/index/main.js
// Catalog glue:
// - Grid/search: site-wide results take priority; otherwise show active category.
// - Featured carousel: category-scoped.
// - Hide carousel when search returns results.
// - New: "Request a book" CTA in header and mobile FAB open the request panel.

import { subscribeToAllAvailable } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const carouselSection = document.getElementById('homeCarousel');

// NEW: request UI handles
const openRequestBtn = document.getElementById('openRequestBtn');
const requestFab = document.getElementById('requestFab');
const requestPanel = document.getElementById('requestPanel');

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = []; // site-wide dataset (status == 'available')

// ---- Helpers ----
const normalize = (s = '') => String(s).toLowerCase();

function filterBySearch(docs, term) {
  const t = normalize(term).trim();
  if (!t) return [];
  return docs.filter(
    (b) =>
      normalize(b.title || '').includes(t) ||
      normalize(b.author || '').includes(t)
  );
}
function filterByCategory(docs, category) {
  return docs.filter((b) => (b.category || '') === category);
}
function hideCarouselIfSearching(term, resultsCount) {
  if (!carouselSection) return;
  const hasTerm = !!(term && term.trim());
  const show = !(hasTerm && resultsCount > 0);
  carouselSection.hidden = !show;
  carouselSection.setAttribute('aria-hidden', show ? 'false' : 'true');
}

// NEW: open & focus the Request panel
function openRequest() {
  if (!requestPanel) return;
  try {
    requestPanel.open = true;
  } catch {}
  requestPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const first =
    requestPanel.querySelector('input[name="rtitle"]') ||
    requestPanel.querySelector('input,textarea,select,button');
  if (first) setTimeout(() => first.focus(), 300);
}

// ---- View update ----
function updateView() {
  const term = searchInput?.value || '';
  const matches = term ? filterBySearch(cachedDocs, term) : [];
  const docsToRender = term
    ? matches // site-wide results take priority
    : filterByCategory(cachedDocs, activeCategory); // default view: active category

  // We pass searchTerm='' because we already filtered above.
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: docsToRender,
    searchTerm: '',
  });

  hideCarouselIfSearching(term, matches.length);
}

// ---- Tabs: switch carousel category + re-render grid (category view if no search)
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  setCarouselCategory(activeCategory);
  updateView();
});

// ---- Search: recompute results + carousel visibility
searchInput?.addEventListener('input', updateView);

// ---- Request CTA + FAB listeners
openRequestBtn?.addEventListener('click', openRequest);
requestFab?.addEventListener('click', openRequest);

// ---- Firestore: subscribe once, site-wide
function subscribeAll() {
  if (unsub) unsub();
  unsub = subscribeToAllAvailable(
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

// ---- Boot
initCarousel(activeCategory); // category-scoped featured carousel
subscribeAll();
