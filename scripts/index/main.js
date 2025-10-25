// Intent: glue layer for the catalog page. Minimal orchestration only.
import { subscribeToCategory } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';

const grid = document.getElementById('bookGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('search');
const tabButtons = Array.from(document.querySelectorAll('.tab'));

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = [];

wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  resubscribe();
});

searchInput?.addEventListener('input', () => {
  renderBooks({ gridEl: grid, emptyEl: emptyState, docs: cachedDocs, searchTerm: searchInput.value });
});

function resubscribe() {
  if (unsub) unsub();
  unsub = subscribeToCategory(activeCategory, (docs) => {
    cachedDocs = docs;
    renderBooks({ gridEl: grid, emptyEl: emptyState, docs: cachedDocs, searchTerm: searchInput?.value || '' });
  }, (err) => {
    console.error(err);
    grid.innerHTML = '<p class="error">Could not load books. Check your Firestore rules and indexes.</p>';
  });
}

// Public request form
import { initRequestForm } from './requestForm.js';
initRequestForm();

// Kick things off
resubscribe();
