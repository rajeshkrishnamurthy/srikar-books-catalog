// scripts/index/main.js
// Intent: glue for the catalog page
// - Grid/search: site-wide (subscribeToAllAvailable)
// - Carousel: category-scoped (initCarousel + setCarouselCategory)

import { subscribeToAllAvailable } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab')); // IMPORTANT: define before wireTabs

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = [];

// Tabs: switch the *carousel* category only (grid stays site-wide)
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  setCarouselCategory(activeCategory);
});

searchInput?.addEventListener('input', () => {
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: cachedDocs, // site-wide data
    searchTerm: searchInput.value || '',
  });
});

function subscribeAll() {
  if (unsub) unsub();
  unsub = subscribeToAllAvailable(
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

// Start: category-scoped carousel + site-wide grid/search
initCarousel(activeCategory);
subscribeAll();
