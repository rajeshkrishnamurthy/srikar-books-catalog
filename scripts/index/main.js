// scripts/index/main.js
// Catalog glue: site-wide search/grid + category-scoped Embla carousel.
// New behavior: hide the carousel whenever search returns one or more results.

import { subscribeToAllAvailable } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const carouselSection = document.getElementById('homeCarousel'); // from index.html

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = [];

// ---- Small helper: does the current search have any matches?
function hasMatch(docs, term) {
  const t = (term || '').trim().toLowerCase();
  if (!t) return false;
  return docs.some(
    (b) =>
      (b.title || '').toLowerCase().includes(t) ||
      (b.author || '').toLowerCase().includes(t)
  );
}

// Toggle carousel visibility based on search results.
function toggleCarouselForSearch(term) {
  if (!carouselSection) return;
  const found = hasMatch(cachedDocs, term);
  // Hide if there are matches; show otherwise (empty search or zero matches)
  carouselSection.hidden = !!found;
  carouselSection.setAttribute('aria-hidden', found ? 'true' : 'false');
}

// Tabs: update only the *carousel* category (grid stays site-wide)
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  setCarouselCategory(activeCategory);
});

searchInput?.addEventListener('input', () => {
  const term = searchInput.value || '';
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: cachedDocs, // site-wide docs
    searchTerm: term,
  });
  toggleCarouselForSearch(term);
});

function subscribeAll() {
  if (unsub) unsub();
  unsub = subscribeToAllAvailable(
    (docs) => {
      cachedDocs = docs;
      const term = searchInput?.value || '';
      renderBooks({
        gridEl: grid,
        emptyEl: emptyState,
        docs: cachedDocs,
        searchTerm: term,
      });
      toggleCarouselForSearch(term);
    },
    (err) => {
      console.error(err);
      grid.innerHTML =
        '<p class="error">Could not load books. Check your Firestore rules and indexes.</p>';
    }
  );
}

// Start: category-scoped carousel + site-wide grid/search
initCarousel(activeCategory);
subscribeAll();
