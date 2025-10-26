// scripts/index/main.js
// Catalog glue:
// - Grid/search: site-wide search results take priority.
// - When NOT searching: grid shows only the active category.
// - Featured carousel: still category-scoped.
// - Hide the carousel whenever search returns one or more matches.

import { subscribeToAllAvailable } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const carouselSection = document.getElementById('homeCarousel');

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = []; // site-wide dataset from Firestore (status == 'available')

// ---- Helpers ----
function normalize(s = '') {
  return String(s).toLowerCase();
}
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

function updateView() {
  const term = searchInput?.value || '';
  const matches = term ? filterBySearch(cachedDocs, term) : [];
  const docsToRender = term
    ? matches // site-wide search results take priority
    : filterByCategory(cachedDocs, activeCategory); // default view: active category

  // We pass an empty searchTerm to renderBooks because we already filtered above.
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: docsToRender,
    searchTerm: '',
  });

  hideCarouselIfSearching(term, matches.length);
}

// ---- Tabs: only update the *carousel* category + re-render grid (category view) when not searching
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  setCarouselCategory(activeCategory); // re-subscribe carousel
  updateView(); // if no search term, grid switches to the new category
});

// ---- Search: recompute results + carousel visibility
searchInput?.addEventListener('input', updateView);

// ---- Firestore: subscribe once, site-wide (status == 'available')
function subscribeAll() {
  if (unsub) unsub();
  unsub = subscribeToAllAvailable(
    (docs) => {
      cachedDocs = docs;
      updateView(); // refresh grid (category or search), and carousel visibility
    },
    (err) => {
      console.error(err);
      grid.innerHTML =
        '<p class="error">Could not load books. Check your Firestore rules and indexes.</p>';
    }
  );
}

// ---- Boot
initCarousel(activeCategory); // carousel is category-scoped
subscribeAll();
