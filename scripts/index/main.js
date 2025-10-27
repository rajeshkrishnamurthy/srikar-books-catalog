// scripts/index/main.js
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

// Always render based on current state (no “identical-term” early return here)
function updateView() {
  const term = searchInput?.value || '';
  const searching = hasMinLen(term);
  const matches = searching ? filterBySearch(cachedDocs, term) : [];

  const docsToRender = searching
    ? matches // site-wide search results
    : filterByCategory(cachedDocs, activeCategory); // default: category

  // We already filtered; pass searchTerm:'' to renderBooks
  renderBooks({
    gridEl: grid,
    emptyEl: emptyState,
    docs: docsToRender,
    searchTerm: '',
  });

  // Carousel policy: hide/pause only when there ARE matches, or when offline
  if ((searching && matches.length > 0) || !online) {
    showCarousel(false);
    setCarouselCategory(null); // pause carousel reads entirely
  } else {
    showCarousel(true);
    setCarouselCategory(activeCategory); // resume carousel for current category
  }
}

// Debounce keystrokes; treat short terms as “no search”
function debouncedUpdate() {
  clearTimeout(debounceId);
  debounceId = setTimeout(updateView, 300);
}

// Tabs switch *carousel* category and re-render grid (category view if not searching)
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  if (!hasMinLen(searchInput?.value || '')) {
    setCarouselCategory(activeCategory);
    updateView();
  }
});

// Search input
searchInput?.addEventListener('input', () => {
  debouncedUpdate();
});

// Online/offline: pause carousel while offline, render from cache
window.addEventListener('online', () => {
  online = true;
  if (!hasMinLen(searchInput?.value || '')) setCarouselCategory(activeCategory);
  updateView();
});
window.addEventListener('offline', () => {
  online = false;
  setCarouselCategory(null); // hard pause carousel
  updateView();
});

// --- Hamburger menu wiring ---
const menuBtn = document.getElementById('menuBtn');
const siteMenu = document.getElementById('siteMenu');
const requestPanel = document.getElementById('requestPanel');

function closeMenu() {
  if (!siteMenu) return;
  siteMenu.hidden = true;
  menuBtn?.setAttribute('aria-expanded', 'false');
}

menuBtn?.addEventListener('click', () => {
  if (!siteMenu) return;
  const willOpen = siteMenu.hidden;
  siteMenu.hidden = !willOpen;
  menuBtn.setAttribute('aria-expanded', String(willOpen));
});

document.addEventListener('click', (e) => {
  if (!siteMenu || siteMenu.hidden) return;
  const withinMenu = siteMenu.contains(e.target);
  const onBtn = menuBtn && menuBtn.contains(e.target);
  if (!withinMenu && !onBtn) closeMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

// Open the request form from the menu (scroll + focus)
siteMenu
  ?.querySelector('[data-action="request"]')
  ?.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    if (!requestPanel) return;
    requestPanel.open = true; // open <details>
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
      updateView(); // ← ensure first load renders the category grid
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
