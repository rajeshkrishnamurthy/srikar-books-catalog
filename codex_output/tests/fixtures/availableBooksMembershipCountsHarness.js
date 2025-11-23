const { buildAvailableBooksDom, flushCounts } = require('./membershipCountBadgeHarness.js');

async function createAvailableBooksMembershipCountsHarness(options = {}) {
  const { list, cards, badges, badgesById } = buildAvailableBooksDom(options.books);

  const pagination = document.createElement('div');
  pagination.id = 'availableBooksPagination';
  pagination.setAttribute('data-test', 'availableBooksPagination');
  document.body.appendChild(pagination);

  const defaultCounts = options.countsById || {};
  const adapters = {
    getBundleMembershipCounts: jest.fn(async ({ bookIds = [] } = {}) => {
      const countsSource =
        typeof options.getBundleMembershipCounts === 'function'
          ? await options.getBundleMembershipCounts(bookIds)
          : defaultCounts;
      const counts = countsSource || {};
      const response = {};

      bookIds.forEach((id) => {
        if (counts[id] !== undefined) {
          response[id] = counts[id];
        }
      });

      return response;
    }),
    formatBundleCount: jest.fn((count) => `${count} bundle${count === 1 ? '' : 's'}`),
    announceBundleCount: jest.fn(),
    ...(options.adapters || {})
  };

  const params = {
    itemSelector: '#availableBooksList [data-book-id]',
    badgeSelector: "[data-test='bundleMembershipBadge']",
    itemIdAttr: 'data-book-id',
    paginationSelector: '#availableBooksPagination',
    ...(options.params || {})
  };

  let importError;
  let mountError;
  let api;
  let mountAvailableBooksMembershipCounts;

  try {
    const required = await import('../../src/ui/patterns/membership-count-badge/available-books.js');
    mountAvailableBooksMembershipCounts =
      required?.mountAvailableBooksMembershipCounts ||
      required?.default ||
      required?.mount ||
      required?.initAvailableBooksMembershipCounts ||
      required?.refreshBundleMembershipCounts;
  } catch (error) {
    importError = error;
  }

  if (!importError) {
    if (typeof mountAvailableBooksMembershipCounts === 'function') {
      try {
        api = await mountAvailableBooksMembershipCounts({
          params,
          adapters
        });
      } catch (error) {
        mountError = error;
      }
    } else {
      mountError = new Error('mountAvailableBooksMembershipCounts export missing');
    }
  }

  function dispatchPageChange(bookIds = []) {
    const safeIds = Array.isArray(bookIds) ? bookIds : [];
    const event = new CustomEvent('pagechange', {
      detail: { bookIds: safeIds }
    });
    pagination.dispatchEvent(event);
  }

  function cleanup() {
    document.body.innerHTML = '';
  }

  return {
    list,
    cards,
    badges,
    badgesById,
    pagination,
    adapters,
    params,
    api,
    importError,
    mountError,
    dispatchPageChange,
    cleanup
  };
}

module.exports = {
  createAvailableBooksMembershipCountsHarness,
  flushCounts
};
