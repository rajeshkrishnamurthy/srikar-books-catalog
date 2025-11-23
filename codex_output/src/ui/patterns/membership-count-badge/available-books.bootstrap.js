import { mountAvailableBooksMembershipCounts } from './available-books.js';

let mountedApi;
let pendingMount;
const RETRY_DELAY_MS = 500;
const RETRY_LIMIT = 20;

function readGlobalConfig() {
  if (typeof window === 'undefined') return {};
  return window.availableBooksMembershipCounts || {};
}

function buildParams(overrides = {}) {
  const globalConfig = readGlobalConfig();
  const params = { ...(globalConfig.params || {}), ...(overrides.params || {}) };

  return {
    itemSelector: params.itemSelector || '#availableBooksList [data-book-id]',
    badgeSelector: params.badgeSelector || "[data-test='bundleMembershipBadge']",
    itemIdAttr: params.itemIdAttr || 'data-book-id',
    paginationSelector: params.paginationSelector || '#availableBooksPagination',
    showZeroBadges: params.showZeroBadges,
    zeroHiddenClass: params.zeroHiddenClass,
    countLabelTemplate: params.countLabelTemplate,
    announcePoliteness: params.announcePoliteness
  };
}

function buildAdapters(overrides = {}) {
  const globalConfig = readGlobalConfig();
  const adapters = { ...(globalConfig.adapters || {}), ...(overrides.adapters || {}) };

  return {
    getBundleMembershipCounts: adapters.getBundleMembershipCounts,
    formatBundleCount: adapters.formatBundleCount,
    announceBundleCount: adapters.announceBundleCount
  };
}

function buildUiTexts(overrides = {}) {
  const globalConfig = readGlobalConfig();
  return { ...(globalConfig.uiTexts || {}), ...(overrides.uiTexts || {}) };
}

function hasAnchors(params) {
  const hasItems = !!document.querySelector(params.itemSelector);
  const hasPagination =
    !!params.pagination ||
    !!document.querySelector(params.paginationSelector || '#availableBooksPagination');
  return hasItems && hasPagination;
}

function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

async function doMount(options = {}) {
  const params = buildParams(options);
  if (!hasAnchors(params)) return null;

  const adapters = buildAdapters(options);
  const uiTexts = buildUiTexts(options);

  mountedApi =
    mountedApi ||
    (await mountAvailableBooksMembershipCounts({
      params,
      adapters,
      uiTexts
    }));

  if (typeof window !== 'undefined') {
    window.availableBooksMembershipCountsApi = mountedApi;
  }

  return mountedApi;
}

async function attemptMountWithRetry(options = {}, attempt = 0) {
  if (mountedApi) return mountedApi;

  const params = buildParams(options);
  if (hasAnchors(params)) {
    return doMount(options);
  }

  if (attempt >= RETRY_LIMIT) {
    return null;
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(attemptMountWithRetry(options, attempt + 1));
    }, RETRY_DELAY_MS);
  });
}

async function autoMountIfEnabled() {
  const globalConfig = readGlobalConfig();
  if (globalConfig.autoMount === false) return;
  pendingMount =
    pendingMount ||
    attemptMountWithRetry(globalConfig).catch(() => {
      pendingMount = null;
      return null;
    });
  await pendingMount;
}

onReady(() => {
  autoMountIfEnabled();
});

export async function bootstrapAvailableBooksMembershipBadges(options = {}) {
  return attemptMountWithRetry(options);
}

export function getAvailableBooksMembershipBadgesApi() {
  return mountedApi;
}

if (typeof window !== 'undefined') {
  window.bootstrapAvailableBooksMembershipBadges = bootstrapAvailableBooksMembershipBadges;
  window.getAvailableBooksMembershipBadgesApi = getAvailableBooksMembershipBadgesApi;
}
