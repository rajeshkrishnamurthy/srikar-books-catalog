const defaultBooks = [
  { id: 'book-1', title: 'First Book' },
  { id: 'book-2', title: 'Second Book' },
  { id: 'book-3', title: 'Third Book' }
];

function buildAvailableBooksDom(books = defaultBooks) {
  document.body.innerHTML = '';

  const list = document.createElement('section');
  list.id = 'availableBooksList';

  books.forEach((book) => {
    const card = document.createElement('article');
    card.setAttribute('data-book-id', book.id);
    card.setAttribute('data-test', 'availableBookCard');

    const cover = document.createElement('img');
    cover.alt = `${book.title} cover`;
    card.appendChild(cover);

    const badge = document.createElement('span');
    badge.setAttribute('data-test', 'bundleMembershipBadge');
    badge.hidden = true;
    badge.textContent = '';
    card.appendChild(badge);

    list.appendChild(card);
  });

  document.body.appendChild(list);

  const cards = Array.from(list.querySelectorAll('[data-book-id]'));
  const badges = Array.from(list.querySelectorAll("[data-test='bundleMembershipBadge']"));
  const badgesById = {};

  badges.forEach((badge) => {
    const host = badge.closest('[data-book-id]');
    const id = host?.getAttribute('data-book-id');
    if (id) {
      badgesById[id] = badge;
    }
  });

  return { list, cards, badges, badgesById };
}

async function createMembershipCountBadgeHarness(options = {}) {
  const { list, cards, badges, badgesById } = buildAvailableBooksDom(options.books);

  const defaultCounts = options.countsById || {};
  const adapters = {
    fetchCounts: jest.fn(async ({ ids = [] } = {}) => {
      const countsSource = typeof options.fetchCounts === 'function' ? options.fetchCounts(ids) : defaultCounts;
      const counts = countsSource || {};
      const response = {};

      ids.forEach((id) => {
        if (counts[id] !== undefined) {
          response[id] = counts[id];
        }
      });

      return response;
    }),
    formatCount: jest.fn((count) => `${count} bundle${count === 1 ? '' : 's'}`),
    announce: jest.fn(),
    ...(options.adapters || {})
  };

  const params = {
    itemSelector: '#availableBooksList [data-book-id]',
    badgeSelector: "[data-test='bundleMembershipBadge']",
    itemIdAttr: 'data-book-id',
    ...(options.params || {})
  };

  let importError;
  let mountError;
  let api;
  let mountMembershipCountBadge;

  try {
    const required = await import('../../src/ui/patterns/membership-count-badge/index.js');
    mountMembershipCountBadge =
      required?.default || required?.mountMembershipCountBadge || required?.mount || required;
  } catch (error) {
    importError = error;
  }

  if (!importError) {
    if (typeof mountMembershipCountBadge === 'function') {
      try {
        api = await mountMembershipCountBadge({
          params,
          adapters,
          uiTexts: options.uiTexts || {}
        });
      } catch (error) {
        mountError = error;
      }
    } else {
      mountError = new Error('mountMembershipCountBadge export missing');
    }
  }

  function cleanup() {
    document.body.innerHTML = '';
  }

  return {
    list,
    cards,
    badges,
    badgesById,
    adapters,
    params,
    api,
    importError,
    mountError,
    cleanup
  };
}

function flushCounts() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

module.exports = {
  defaultBooks,
  buildAvailableBooksDom,
  createMembershipCountBadgeHarness,
  flushCounts
};
