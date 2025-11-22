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

  const badgeApi = await mountMembershipCountBadge({
    params: {
      itemSelector: params.itemSelector || '#availableBooksList [data-book-id]',
      badgeSelector: params.badgeSelector || "[data-test='bundleMembershipBadge']",
      itemIdAttr: params.itemIdAttr || 'data-book-id',
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

  async function refreshBundleMembershipCounts(bookIds = []) {
    const safeIds = toSafeArray(bookIds);
    return badgeApi.sync?.(safeIds);
  }

  function handlePageChange(event) {
    const pageIds = toSafeArray(event?.detail?.bookIds);
    refreshBundleMembershipCounts(pageIds);
  }

  pagination.addEventListener('pagechange', handlePageChange);

  return {
    refreshBundleMembershipCounts,
    destroy() {
      pagination.removeEventListener('pagechange', handlePageChange);
      badgeApi.destroy?.();
    }
  };
}

export { mountAvailableBooksMembershipCounts, mountAvailableBooksMembershipCounts as mount };
export default mountAvailableBooksMembershipCounts;
