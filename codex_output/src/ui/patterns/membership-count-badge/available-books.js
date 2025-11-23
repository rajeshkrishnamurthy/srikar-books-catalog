import { mountMembershipCountBadge } from './index.js';

function toSafeArray(list) {
  return Array.isArray(list) ? list : [];
}

function resolvePagination(params = {}) {
  if (params.pagination) return params.pagination;
  if (params.paginationSelector) return document.querySelector(params.paginationSelector);
  return document.querySelector('#availableBooksPagination');
}

async function mountAvailableBooksMembershipCounts(options = {}) {
  const params = options.params || {};
  const adapters = options.adapters || {};
  const itemSelector = params.itemSelector || '#availableBooksList [data-book-id]';
  const badgeSelector = params.badgeSelector || "[data-test='bundleMembershipBadge']";
  const itemIdAttr = params.itemIdAttr || 'data-book-id';

  const badgeApi = await mountMembershipCountBadge({
    params: {
      itemSelector,
      badgeSelector,
      itemIdAttr,
      showZeroBadges: params.showZeroBadges,
      zeroHiddenClass: params.zeroHiddenClass,
      countLabelTemplate: params.countLabelTemplate,
      announcePoliteness: params.announcePoliteness
    },
    adapters: {
      fetchCounts: async ({ ids = [] } = {}) => {
        const safeIds = toSafeArray(ids);
        if (typeof adapters.getBundleMembershipCounts === 'function') {
          return adapters.getBundleMembershipCounts({ bookIds: safeIds });
        }
        return {};
      },
      formatCount: adapters.formatBundleCount,
      announce: adapters.announceBundleCount
    },
    uiTexts: options.uiTexts || {}
  });

  const pagination = resolvePagination(params);
  if (!pagination) {
    throw new Error('available books pagination anchor missing');
  }

  let pendingIds = null;
  let scheduledSync = null;

  function getVisibleBookIds() {
    return Array.from(document.querySelectorAll(itemSelector))
      .map((item) => item.getAttribute(itemIdAttr))
      .filter(Boolean);
  }

  // Defer syncing so init + same-tick pagination events collapse into one adapter call.
  function scheduleSync(ids = []) {
    pendingIds = toSafeArray(ids);
    if (scheduledSync) return scheduledSync;

    scheduledSync = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          while (pendingIds !== null) {
            const idsToSync = pendingIds || [];
            pendingIds = null;
            await badgeApi.sync?.(idsToSync);
          }
          resolve();
        } finally {
          const hasQueued = pendingIds !== null;
          scheduledSync = null;
          if (hasQueued) {
            scheduleSync(pendingIds);
          }
        }
      }, 0);
    });

    return scheduledSync;
  }

  async function refreshBundleMembershipCounts(bookIds = []) {
    const safeIds = toSafeArray(bookIds);
    const idsToSync = safeIds.length ? safeIds : getVisibleBookIds();
    return scheduleSync(idsToSync);
  }

  function handlePageChange(event) {
    const pageIds = toSafeArray(event?.detail?.bookIds);
    scheduleSync(pageIds);
  }

  pagination.addEventListener('pagechange', handlePageChange);

  const visibleBookIds = getVisibleBookIds();
  if (visibleBookIds.length) {
    scheduleSync(visibleBookIds);
  }

  return {
    refreshBundleMembershipCounts,
    setShowZeroBadges(flag) {
      badgeApi.setShowZeroBadges?.(flag);
    },
    destroy() {
      pagination.removeEventListener('pagechange', handlePageChange);
      badgeApi.destroy?.();
    }
  };
}

export { mountAvailableBooksMembershipCounts, mountAvailableBooksMembershipCounts as mount };
export default mountAvailableBooksMembershipCounts;
