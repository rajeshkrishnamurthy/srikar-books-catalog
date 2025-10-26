// Intent: glue layer for the catalog page. Minimal orchestration only.
// Global search: when search has any text, subscribe to ALL available books;
// otherwise subscribe to the active category. Rendering stays in render.js.

import {
  subscribeToCategory,
  subscribeToAllAvailable,
} from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel } from './carousel.js'; // NEW

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab'));

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = [];
let usingAll = false; // tracks current subscription scope

function isGlobalSearchActive() {
  return (searchInput?.value || '').trim().length > 0;
}

function resubscribe() {
  if (unsub) unsub();

  const onNext = (docs) => {
    cachedDocs = docs;
    renderBooks({
      gridEl: grid,
      emptyEl: emptyState,
      docs: cachedDocs,
      searchTerm: searchInput?.value || '',
    });
  };
  const onError = (err) => {
    console.error(err);
    grid.innerHTML =
      '<p class="error">Could not load books. Check your Firestore rules and indexes.</p>';
  };

  if (isGlobalSearchActive()) {
    usingAll = true;
    unsub = subscribeToAllAvailable(onNext, onError);
  } else {
    usingAll = false;
    unsub = subscribeToCategory(activeCategory, onNext, onError);
  }
}

// Tabs: only resubscribe if we’re NOT in global search (since search spans all categories)
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  if (!isGlobalSearchActive()) resubscribe();
});

// Search: if scope flips (none → global or global → none), resubscribe; always re-render
searchInput?.addEventListener('input', () => {
  const wasAll = usingAll;
  const nowAll = isGlobalSearchActive();
  if (nowAll !== wasAll) resubscribe();
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: cachedDocs,
    searchTerm: searchInput.value,
  });
});

// Public request form
import { initRequestForm } from './requestForm.js';
initRequestForm();

// Kick things off
initCarousel(); // NEW — no markup change needed
resubscribe();
