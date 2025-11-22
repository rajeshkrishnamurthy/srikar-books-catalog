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
    cursorAfter,
    cursorBefore,
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
    Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaultSize;
  const clampedSize = Math.min(max, Math.max(min, rawSize));

  const safeDirection =
    direction === 'backward' || direction === 'forward'
      ? direction
      : 'forward';

  const resolvedCursorAfter =
    cursorAfter !== undefined
      ? cursorAfter
      : safeDirection === 'forward'
      ? cursors.start ?? null
      : null;
  const resolvedCursorBefore =
    cursorBefore !== undefined
      ? cursorBefore
      : safeDirection === 'backward'
      ? cursors.end ?? null
      : null;

  return {
    pageSize: clampedSize,
    direction: safeDirection,
    cursorAfter: resolvedCursorAfter ?? null,
    cursorBefore: resolvedCursorBefore ?? null,
  };
}

export function buildPaginationState(options = {}) {
  const {
    items = [],
    pageSize,
    hasNext = false,
    hasPrev = false,
    cursors = {},
    nextCursor,
    prevCursor,
  } = options;

  const normalizedItems = Array.isArray(items) ? items : [];
  const size =
    Number.isFinite(pageSize) && pageSize > 0
      ? pageSize
      : normalizedItems.length;

  const pageMeta = {
    pageSize: size,
    count: normalizedItems.length,
    hasNext: Boolean(hasNext),
    hasPrev: Boolean(hasPrev),
    nextCursor:
      nextCursor !== undefined
        ? nextCursor
        : cursors.end ?? null,
    prevCursor:
      prevCursor !== undefined
        ? prevCursor
        : cursors.start ?? null,
  };

  const state = {
    items: normalizedItems,
    pageMeta,
  };

  Object.defineProperty(state, 'meta', {
    enumerable: false,
    configurable: true,
    get() {
      return pageMeta;
    },
  });

  return state;
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
    adapters = {},
    pageSizeOptions,
  } = config;

  const normalizedPageSizeOptions = Array.isArray(pageSizeOptions)
    ? Array.from(
        new Set(
          pageSizeOptions
            .map((value) => Math.round(Number(value)))
            .filter((value) => Number.isFinite(value) && value > 0)
        )
      ).sort((a, b) => a - b)
    : null;

  const defaultSize =
    normalizedPageSizeOptions?.includes(defaultPageSize)
      ? defaultPageSize
      : normalizedPageSizeOptions?.[0] ?? defaultPageSize;

  const normalizePageSize = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const rounded = Math.max(1, Math.round(numeric));
    if (!normalizedPageSizeOptions?.length) {
      return rounded;
    }
    return normalizedPageSizeOptions.includes(rounded)
      ? rounded
      : defaultSize;
  };

  const state = {
    mode,
    filters: { ...initialFilters },
    offset: 0,
    currentOffset: 0,
    totalItems: 0,
    items: [],
    pageMeta: {
      pageSize: normalizePageSize(defaultSize) ?? defaultSize,
      count: 0,
      hasNext: false,
      hasPrev: false,
      nextCursor: null,
      prevCursor: null,
    },
    isLoading: false,
    loadMoreLabel: config.loadMoreLabel,
  };

  const locationAdapters = {
    parseLocation: adapters?.parseLocation,
    syncLocation: adapters?.syncLocation,
  };

  const emitLocationSnapshot = () => {
    if (typeof locationAdapters.syncLocation !== 'function') return;
    const params = buildPaginationLocationParams({
      pageMeta: state.pageMeta,
      offset: state.currentOffset,
      filters: state.filters,
    });
    locationAdapters.syncLocation(params);
  };

  const notifyStateChange = () => {
    if (typeof onStateChange === 'function') {
      onStateChange({
        mode: state.mode,
        filters: { ...state.filters },
        offset: state.offset,
        currentOffset: state.currentOffset,
        totalItems: state.totalItems,
        items: Array.isArray(state.items) ? state.items.slice() : [],
        pageMeta: { ...state.pageMeta },
        isLoading: state.isLoading,
      });
    }
    emitLocationSnapshot();
  };

  let lastRequestId = 0;

  const normalizeResultPageMeta = (resultMeta = {}) => {
    const nextCursor =
      resultMeta.nextCursor !== undefined
        ? resultMeta.nextCursor
        : resultMeta.cursors?.end ?? state.pageMeta.nextCursor ?? null;
    const prevCursor =
      resultMeta.prevCursor !== undefined
        ? resultMeta.prevCursor
        : resultMeta.cursors?.start ?? state.pageMeta.prevCursor ?? null;
    return {
      ...state.pageMeta,
      ...resultMeta,
      nextCursor: nextCursor ?? null,
      prevCursor: prevCursor ?? null,
    };
  };

  const applyResult = (result, requestId) => {
    if (requestId !== lastRequestId) {
      return;
    }
    if (!result) {
      state.isLoading = false;
      notifyStateChange();
      return;
    }
    if (result.mode) {
      state.mode = result.mode;
    }
    if (result.loadMoreLabel !== undefined) {
      state.loadMoreLabel = result.loadMoreLabel;
    }
    if (result.pageMeta) {
      state.pageMeta = normalizeResultPageMeta(result.pageMeta);
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
    state.items = Array.isArray(result.items) ? result.items.slice() : [];
    state.isLoading = false;
    notifyStateChange();
  };

  const handleRequestError = (requestId) => {
    if (requestId !== lastRequestId) {
      return;
    }
    state.isLoading = false;
    notifyStateChange();
  };

  const runDataSource = (direction = 'forward') => {
    if (typeof dataSource !== 'function') return;
    lastRequestId += 1;
    const requestId = lastRequestId;
    state.isLoading = true;
    notifyStateChange();
    const minPageSize = normalizedPageSizeOptions?.[0] ?? 1;
    const maxPageSize =
      (normalizedPageSizeOptions?.[
        normalizedPageSizeOptions.length - 1
      ] ??
        state.pageMeta.pageSize) || defaultSize;
    const request = createPaginationRequest({
      pageSize: state.pageMeta.pageSize,
      direction,
      cursorAfter: state.pageMeta.nextCursor,
      cursorBefore: state.pageMeta.prevCursor,
      defaults: {
        pageSize: state.pageMeta.pageSize || defaultSize,
        minPageSize,
        maxPageSize,
      },
    });
    request.currentOffset = state.currentOffset;
    const response = dataSource({
      request,
      filters: { ...state.filters },
      offset: state.offset,
    });
    if (response && typeof response.then === 'function') {
      response.then((payload) => applyResult(payload, requestId)).catch(() => {
        handleRequestError(requestId);
      });
    } else {
      applyResult(response, requestId);
    }
  };

  notifyStateChange();

  const resetCursors = () => {
    state.pageMeta.nextCursor = null;
    state.pageMeta.prevCursor = null;
  };

  const safeTotalItems = () => {
    if (Number.isFinite(state.totalItems) && state.totalItems >= 0) {
      return state.totalItems;
    }
    if (
      Number.isFinite(state.pageMeta?.count) &&
      state.pageMeta.count >= 0
    ) {
      return state.pageMeta.count;
    }
    return 0;
  };

  return {
    getUiState() {
      const shell = buildPaginationShellState({
        pageMeta: state.pageMeta,
        totalItems: state.totalItems,
        offset: state.currentOffset,
        isLoading: state.isLoading,
      });
      const pageMetaSize =
        Number.isFinite(state.pageMeta?.pageSize) &&
        state.pageMeta.pageSize > 0
          ? state.pageMeta.pageSize
          : defaultSize;
      const normalizedTotal = safeTotalItems();
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
        mode: state.mode,
        loadMoreLabel: state.loadMoreLabel,
        pageMeta: { ...state.pageMeta },
        totalItems: normalizedTotal,
        currentOffset,
        totalPages,
        currentPage,
        items: Array.isArray(state.items) ? state.items.slice() : [],
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
      resetCursors();
      runDataSource('forward');
    },
    syncFromLocation(options = {}) {
      const { search = '', totalItems = state.totalItems } = options || {};
      let parsed =
        typeof locationAdapters.parseLocation === 'function'
          ? locationAdapters.parseLocation(options)
          : null;
      if (!parsed) {
        parsed = parsePaginationFromLocation({
          search,
          totalItems,
          defaultPageSize: state.pageMeta.pageSize || defaultSize,
        });
        parsed.totalItems = totalItems;
      }
      const parsedSize =
        normalizePageSize(parsed.pageSize) ?? state.pageMeta.pageSize;
      state.pageMeta.pageSize = parsedSize;
      state.offset =
        Number.isFinite(parsed.offset) && parsed.offset >= 0
          ? parsed.offset
          : 0;
      state.currentOffset = state.offset;
      if (parsed.filters && typeof parsed.filters === 'object') {
        state.filters = { ...state.filters, ...parsed.filters };
      }
      if (Number.isFinite(parsed.totalItems)) {
        state.totalItems = parsed.totalItems;
      } else {
        state.totalItems = totalItems;
      }
      state.pageMeta.nextCursor =
        parsed.cursorAfter !== undefined ? parsed.cursorAfter : null;
      state.pageMeta.prevCursor =
        parsed.cursorBefore !== undefined ? parsed.cursorBefore : null;
      const runDirection =
        parsed.direction === 'backward' ? 'backward' : 'forward';
      runDataSource(runDirection);
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
        Number.isFinite(state.pageMeta?.pageSize) &&
        state.pageMeta.pageSize > 0
          ? state.pageMeta.pageSize
          : defaultSize;
      if (!pageSize || pageSize <= 0) return;
      const total = safeTotalItems();
      const maxPage =
        total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : Math.max(1, 1);
      const safePage = Math.min(
        maxPage,
        Math.max(1, Math.round(numeric))
      );
      const targetOffset = (safePage - 1) * pageSize;
      state.offset = targetOffset;
      state.currentOffset = targetOffset;
      resetCursors();
      runDataSource('forward');
    },
    setPageSize(newSize) {
      const normalized = normalizePageSize(newSize);
      const requestedNumeric = Math.round(Number(newSize));
      const isSupported =
        !normalizedPageSizeOptions?.length ||
        normalizedPageSizeOptions.includes(requestedNumeric);
      if (!normalized) return;
      if (state.pageMeta.pageSize === normalized && isSupported) return;
      state.pageMeta.pageSize = normalized;
      state.offset = 0;
      state.currentOffset = 0;
      resetCursors();
      runDataSource('forward');
    },
  };
}
