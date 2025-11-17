// Intent: normalization helpers for authors/ISBNs/keys used by admin flows.
export function normalizeAuthorName(str = '') {
  return String(str)
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function authorKeyFromName(str = '') {
  const base = normalizeAuthorName(str)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return base.replace(/ /g, '-').slice(0, 100);
}

export function onlyDigitsX(v = '') {
  return String(v || '').replace(/[^\dxX]/g, '');
}

// F18-TP1: shared pagination contract helpers.
export function createPaginationRequest(options = {}) {
  const {
    pageSize,
    direction,
    cursors = {},
    defaults = {},
  } = options;

  const defaultSize =
    Number.isFinite(defaults.pageSize) && defaults.pageSize > 0
      ? defaults.pageSize
      : 25;

  const min =
    Number.isFinite(defaults.minPageSize) && defaults.minPageSize > 0
      ? defaults.minPageSize
      : defaultSize;
  const max =
    Number.isFinite(defaults.maxPageSize) && defaults.maxPageSize >= min
      ? defaults.maxPageSize
      : defaultSize;

  const rawSize =
    Number.isFinite(pageSize) && pageSize > 0 ? pageSize : min;
  const clampedSize = Math.min(max, Math.max(min, rawSize));

  const safeDirection =
    direction === 'backward' || direction === 'forward'
      ? direction
      : 'forward';

  let cursorType = 'start';
  let cursor = null;
  if (safeDirection === 'forward') {
    cursorType = 'start';
    cursor = cursors.start ?? null;
  } else {
    cursorType = 'end';
    cursor = cursors.end ?? null;
  }

  return {
    pageSize: clampedSize,
    direction: safeDirection,
    cursor,
    cursorType,
  };
}

export function buildPaginationState(options = {}) {
  const {
    items = [],
    pageSize,
    hasNext = false,
    hasPrev = false,
    cursors = {},
  } = options;

  const normalizedItems = Array.isArray(items) ? items : [];
  const size =
    Number.isFinite(pageSize) && pageSize > 0 ? pageSize : normalizedItems.length;

  return {
    items: normalizedItems,
    meta: {
      pageSize: size,
      count: normalizedItems.length,
      hasNext: Boolean(hasNext),
      hasPrev: Boolean(hasPrev),
      cursors: {
        start: cursors.start ?? null,
        end: cursors.end ?? null,
      },
    },
  };
}

export function buildPaginationShellState(options = {}) {
  const {
    pageMeta = {},
    totalItems,
    offset = 0,
    isLoading = false,
  } = options;

  const count =
    Number.isFinite(pageMeta.count) && pageMeta.count >= 0
      ? pageMeta.count
      : 0;
  const total =
    Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : count;

  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

  const firstIndex =
    total === 0 || count === 0 ? 0 : safeOffset + 1;
  const lastIndex =
    total === 0 || count === 0 ? 0 : safeOffset + count;

  const summaryText = `Items ${firstIndex}\u2013${lastIndex} of ${total}`;

  const basePrevDisabled = !pageMeta.hasPrev || safeOffset <= 0;
  const baseNextDisabled = !pageMeta.hasNext;

  const prevDisabled = isLoading || basePrevDisabled;
  const nextDisabled = isLoading || baseNextDisabled;

  return {
    summaryText,
    prevDisabled,
    nextDisabled,
    isBusy: Boolean(isLoading),
  };
}

// F18-TP3: public catalog pagination UI helper.
export function buildCatalogPaginationUi(options = {}) {
  const {
    pageMeta = {},
    totalItems,
    offset = 0,
    mode = 'pager',
    // activeTab is accepted for future per-tab tweaks but not used yet.
    activeTab, // eslint-disable-line no-unused-vars
    isLoading = false,
  } = options;

  const shell = buildPaginationShellState({
    pageMeta,
    totalItems,
    offset,
    isLoading,
  });

  const hasMore = Boolean(pageMeta.hasNext);

  const baseState = {
    summaryText: shell.summaryText,
    mode,
    hasMore,
  };

  if (mode === 'loadMore' && hasMore) {
    const count =
      Number.isFinite(pageMeta.count) && pageMeta.count >= 0
        ? pageMeta.count
        : 0;
    const total =
      Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : count;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    const nextFirst = safeOffset + count + 1;
    const nextLast = Math.min(total, safeOffset + count + pageMeta.pageSize);

    return {
      ...baseState,
      loadMoreLabel: `Load more books (${nextFirst}\u2013${nextLast} of ${total})`,
    };
  }

  return baseState;
}

// F18-TP4: pagination location (URL/hash) helpers.
export function buildPaginationLocationParams(options = {}) {
  const {
    pageMeta = {},
    offset = 0,
    filters = {},
  } = options;

  const size =
    Number.isFinite(pageMeta.pageSize) && pageMeta.pageSize > 0
      ? pageMeta.pageSize
      : 1;
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const page = Math.floor(safeOffset / size) + 1;

  const params = {
    page,
    pageSize: size,
    offset: safeOffset,
  };

  Object.keys(filters || {}).forEach((key) => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '') {
      params[key] = String(value);
    }
  });

  return params;
}

export function parsePaginationFromLocation(options = {}) {
  const {
    search = '',
    totalItems,
    defaultPageSize = 20,
  } = options;

  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);

  const pageParam = Number.parseInt(params.get('page') || '', 10);
  const sizeParam = Number.parseInt(params.get('pageSize') || '', 10);
  const offsetParam = Number.parseInt(params.get('offset') || '', 10);

  const pageSize =
    Number.isFinite(sizeParam) && sizeParam > 0 ? sizeParam : defaultPageSize;

  const total =
    Number.isFinite(totalItems) && totalItems > 0 ? totalItems : 0;
  const maxPage =
    total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  let page =
    Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  if (page > maxPage) {
    page = maxPage;
  }

  const inferredOffset = (page - 1) * pageSize;

  let safeOffset =
    Number.isFinite(offsetParam) && offsetParam >= 0
      ? offsetParam
      : inferredOffset;

  if (safeOffset + pageSize > total && total > 0) {
    safeOffset = inferredOffset;
  }

  const filters = {};
  params.forEach((value, key) => {
    if (key === 'page' || key === 'pageSize' || key === 'offset') return;
    if (value !== '') {
      filters[key] = value;
    }
  });

  return {
    page,
    pageSize,
    offset: safeOffset,
    filters,
  };
}

export function createPaginationController(config = {}) {
  const {
    dataSource,
    defaultPageSize = 20,
    initialFilters = {},
    mode = 'pager',
    onStateChange,
  } = config;

  const state = {
    mode,
    filters: { ...initialFilters },
    offset: 0,
    currentOffset: 0,
    totalItems: 0,
    pageMeta: {
      pageSize: defaultPageSize,
      count: 0,
      hasNext: false,
      hasPrev: false,
      cursors: { start: null, end: null },
    },
    isLoading: false,
  };

  const notifyStateChange = () => {
    if (typeof onStateChange === 'function') {
      onStateChange({
        mode: state.mode,
        filters: { ...state.filters },
        offset: state.offset,
        totalItems: state.totalItems,
        pageMeta: { ...state.pageMeta },
        isLoading: state.isLoading,
      });
    }
  };

  const applyResult = (result) => {
    if (!result) {
      state.isLoading = false;
      notifyStateChange();
      return;
    }
    if (result.pageMeta) {
      state.pageMeta = {
        ...state.pageMeta,
        ...result.pageMeta,
      };
    }
    if (Number.isFinite(result.totalItems)) {
      state.totalItems = result.totalItems;
    }
    if (Number.isFinite(result.offset)) {
      state.offset = result.offset;
    }
    if (Number.isFinite(result.currentOffset)) {
      state.currentOffset = result.currentOffset;
    }
    state.isLoading = false;
    notifyStateChange();
  };

  const runDataSource = (direction = 'forward') => {
    if (typeof dataSource !== 'function') return;
    state.isLoading = true;
    notifyStateChange();
    const request = createPaginationRequest({
      pageSize: state.pageMeta.pageSize,
      direction,
      cursors: state.pageMeta.cursors || {},
      defaults: { pageSize: defaultPageSize, minPageSize: 1, maxPageSize: state.pageMeta.pageSize || defaultPageSize },
    });
    request.currentOffset = state.currentOffset;
    const response = dataSource({
      request,
      filters: { ...state.filters },
      offset: state.offset,
    });
    if (response && typeof response.then === 'function') {
      response.then(applyResult).catch(() => {
        state.isLoading = false;
        notifyStateChange();
      });
    } else {
      applyResult(response);
    }
  };

  notifyStateChange();

  return {
    getUiState() {
      const shell = buildPaginationShellState({
        pageMeta: state.pageMeta,
        totalItems: state.totalItems,
        offset: state.currentOffset,
        isLoading: state.isLoading,
      });
      const pageMetaSize =
        Number.isFinite(state.pageMeta?.pageSize) && state.pageMeta.pageSize > 0
          ? state.pageMeta.pageSize
          : defaultPageSize;
      const normalizedTotal =
        Number.isFinite(state.totalItems) && state.totalItems >= 0
          ? state.totalItems
          : Number.isFinite(state.pageMeta?.count) && state.pageMeta.count >= 0
          ? state.pageMeta.count
          : 0;
      const currentOffset =
        Number.isFinite(state.currentOffset) && state.currentOffset >= 0
          ? state.currentOffset
          : 0;
      const totalPages =
        pageMetaSize > 0
          ? Math.max(1, Math.ceil(normalizedTotal / pageMetaSize || 0))
          : 1;
      const currentPage = Math.min(
        totalPages,
        Math.max(1, Math.floor(currentOffset / (pageMetaSize || 1)) + 1)
      );
      return {
        ...shell,
        pageMeta: { ...state.pageMeta },
        totalItems: normalizedTotal,
        currentOffset,
        totalPages,
        currentPage,
      };
    },
    goNext() {
      runDataSource('forward');
    },
    goPrev() {
      runDataSource('backward');
    },
    loadMore() {
      if (state.mode === 'loadMore') {
        runDataSource('forward');
      }
    },
    setFilters(partial = {}) {
      state.filters = { ...state.filters, ...partial };
      state.offset = 0;
      state.currentOffset = 0;
      runDataSource('forward');
    },
    syncFromLocation({ search = '', totalItems = state.totalItems } = {}) {
      const parsed = parsePaginationFromLocation({
        search,
        totalItems,
        defaultPageSize,
      });
      state.pageMeta.pageSize = parsed.pageSize;
      state.offset = parsed.offset;
      state.currentOffset = parsed.offset;
      state.filters = { ...state.filters, ...parsed.filters };
      state.totalItems = totalItems;
      runDataSource('forward');
    },
    syncToLocation(updateFn) {
      if (typeof updateFn !== 'function') return;
      const params = buildPaginationLocationParams({
        pageMeta: state.pageMeta,
        offset: state.currentOffset,
        filters: state.filters,
      });
      updateFn(params);
    },
    refresh() {
      state.offset = state.currentOffset;
      runDataSource('forward');
    },
    goToPage(pageNumber) {
      const numeric = Number(pageNumber);
      if (!Number.isFinite(numeric)) return;
      const pageSize =
        Number.isFinite(state.pageMeta?.pageSize) && state.pageMeta.pageSize > 0
          ? state.pageMeta.pageSize
          : defaultPageSize;
      if (!pageSize || pageSize <= 0) return;
      const total =
        Number.isFinite(state.totalItems) && state.totalItems >= 0
          ? state.totalItems
          : Number.isFinite(state.pageMeta?.count) && state.pageMeta.count >= 0
          ? state.pageMeta.count
          : 0;
      const maxPage =
        total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : Math.max(1, 1);
      const safePage = Math.min(
        maxPage,
        Math.max(1, Math.round(numeric))
      );
      const targetOffset = (safePage - 1) * pageSize;
      state.offset = targetOffset;
      state.currentOffset = targetOffset;
      state.pageMeta.cursors = { start: null, end: null };
      runDataSource('forward');
    },
    setPageSize(newSize) {
      const numeric = Number(newSize);
      if (!Number.isFinite(numeric) || numeric <= 0) return;
      const clamped = Math.max(1, Math.round(numeric));
      if (state.pageMeta.pageSize === clamped) return;
      state.pageMeta.pageSize = clamped;
      state.offset = 0;
      state.currentOffset = 0;
      state.pageMeta.cursors = { start: null, end: null };
      runDataSource('forward');
    },
  };
}
