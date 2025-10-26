// scripts/index/main.js (only the relevant bits)
import { subscribeToCategory } from './catalogService.js';
import { renderBooks, wireTabs } from './render.js';
import { initCarousel, setCarouselCategory } from './carousel.js';

let activeCategory = 'Fiction';
let unsub = null;
let cachedDocs = [];

// Tabs → also tell the carousel:
wireTabs(tabButtons, (newCat) => {
  activeCategory = newCat;
  resubscribe();
  setCarouselCategory(activeCategory); // <-- NEW
});

// … your existing resubscribe() + search wiring …

// Start the carousel with the initial tab’s category:
initCarousel(activeCategory); // <-- NEW
