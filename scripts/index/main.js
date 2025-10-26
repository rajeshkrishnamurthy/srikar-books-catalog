// scripts/index/main.js
// Intent: glue layer for the catalog page. Minimal orchestration only.
import { subscribeToCategory } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
// IMPORTANT: define tabButtons before wireTabs
const tabButtons = Array.from(document.querySelectorAll('.tab'));

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = [];

// Tabs (also inform the carousel of the new category)
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  resubscribe();
  setCarouselCategory(activeCategory); // keep carousel in sync with tabs
});

searchInput?.addEventListener('input', () => {
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: cachedDocs,
    searchTerm: searchInput.value || '',
  });
});

function resubscribe() {
  if (unsub) unsub();
  unsub = subscribeToCategory(
    activeCategory,
    (docs) => {
      cachedDocs = docs;
      renderBooks({
        gridEl: grid,
        emptyEl: emptyState,
        docs: cachedDocs,
        searchTerm: searchInput?.value || '',
      });
    },
    (err) => {
      console.error(err);
      grid.innerHTML =
        '<p class="error">Could not load books. Check your Firestore rules and indexes.</p>';
    }
  );
}

// Kick things off
initCarousel(activeCategory); // start Embla-based featured carousel for current category
resubscribe();
