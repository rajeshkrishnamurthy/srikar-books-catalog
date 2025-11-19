// scripts/admin/availablePagination.js
// Pagination-aware data source for the Manage Books > Available list.

const firebaseDeps =
  globalThis.__firebaseMocks?.exports ||
  (typeof window !== 'undefined' && !globalThis.process?.env?.JEST_WORKER_ID
    ? await import('../lib/firebase.js')
    : {});

const DEFAULT_PAGE_SIZE = 25;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 50;

function clampPageSize(value = DEFAULT_PAGE_SIZE) {
  const numeric =
    Number.isFinite(value) && value > 0 ? value : DEFAULT_PAGE_SIZE;
  return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, numeric));
}

function normalizeFilters(raw = {}) {
  const safe = {};
  if (raw && typeof raw === 'object') {
    if (raw.supplierId) {
      safe.supplierId = String(raw.supplierId);
    }
  }
  return safe;
}

function buildAvailableWhereConstraints(deps, filters = {}) {
  const constraints = [deps.where('status', '==', 'available')];
  if (filters && filters.supplierId) {
    constraints.push(deps.where('supplierId', '==', filters.supplierId));
  }
  return constraints;
}

function buildBaseQuery(deps, filters = {}) {
  const baseRef = deps.collection(deps.db, 'books');
  const filterConstraints = buildAvailableWhereConstraints(deps, filters);
  return { baseRef, filterConstraints };
}

function extractDocs(snapshot) {
  if (!snapshot) return [];
  if (Array.isArray(snapshot.docs)) return snapshot.docs;
  if (Array.isArray(snapshot)) return snapshot;
  return [];
}

async function computeAvailableCount(deps, filters) {
  const { baseRef, filterConstraints } = buildBaseQuery(deps, filters);
  const countQuery = deps.query(baseRef, ...filterConstraints);
  try {
    if (typeof deps.getCountFromServer === 'function') {
      const snap = await deps.getCountFromServer(countQuery);
      if (snap && typeof snap.data === 'function') {
        const payload = snap.data();
        if (payload && typeof payload.count === 'number') {
          return payload.count;
        }
      }
      if (snap && typeof snap.count === 'number') {
        return snap.count;
      }
    }
  } catch {
    // Fallback to client-side counting below.
  }
  const fallbackSnap = await deps.getDocs(countQuery);
  if (fallbackSnap && typeof fallbackSnap.size === 'number') {
    return fallbackSnap.size;
  }
  if (fallbackSnap && Array.isArray(fallbackSnap.docs)) {
    return fallbackSnap.docs.length;
  }
  if (Array.isArray(fallbackSnap)) {
    return fallbackSnap.length;
  }
  return 0;
}

function deriveOffset({
  direction,
  safeOffset,
  currentOffset,
  pageSize,
  itemCount,
}) {
  const normalizedOffset =
    Number.isFinite(safeOffset) && safeOffset >= 0 ? safeOffset : 0;
  const normalizedCurrent =
    Number.isFinite(currentOffset) && currentOffset >= 0
      ? currentOffset
      : normalizedOffset;
  if (direction === 'backward') {
    const pageOffset = Math.max(0, normalizedCurrent - pageSize);
    return {
      pageOffset,
      currentStart: pageOffset,
    };
  }
  return {
    pageOffset: normalizedOffset + itemCount,
    currentStart: normalizedCurrent,
  };
}

export function createAvailableBooksDataSource(overrides = {}) {
  const deps = {
    db: firebaseDeps.db,
    collection: firebaseDeps.collection,
    query: firebaseDeps.query,
    where: firebaseDeps.where,
    orderBy: firebaseDeps.orderBy,
    limit: firebaseDeps.limit,
    limitToLast: firebaseDeps.limitToLast,
    startAfter: firebaseDeps.startAfter,
    endBefore: firebaseDeps.endBefore,
    getDocs: firebaseDeps.getDocs,
    getCountFromServer: firebaseDeps.getCountFromServer,
    ...overrides,
  };

  if (typeof deps.countAvailable !== 'function') {
    deps.countAvailable = (filters = {}) => computeAvailableCount(deps, filters);
  }

  return async function availableBooksDataSource(options = {}) {
    const { request = {}, filters = {}, offset = 0 } = options || {};
    const direction = request.direction === 'backward' ? 'backward' : 'forward';
    const pageSize = clampPageSize(request.pageSize);
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const currentOffset =
      Number.isFinite(request.currentOffset) && request.currentOffset >= 0
        ? request.currentOffset
        : safeOffset;
    const normalizedFilters = normalizeFilters(filters);
    const limitSize = pageSize + 1;

    const { baseRef, filterConstraints } = buildBaseQuery(
      deps,
      normalizedFilters
    );
    const queryConstraints = [
      ...filterConstraints,
      deps.orderBy('createdAt', 'desc'),
    ];

    const forwardCursor =
      request.cursorAfter ?? request.cursor ?? null;
    const backwardCursor =
      request.cursorBefore ?? request.cursor ?? null;

    if (direction === 'forward' && forwardCursor) {
      queryConstraints.push(deps.startAfter(forwardCursor));
    } else if (direction === 'backward' && backwardCursor) {
      queryConstraints.push(deps.endBefore(backwardCursor));
    }

    if (direction === 'forward') {
      queryConstraints.push(deps.limit(limitSize));
    } else {
      queryConstraints.push(deps.limitToLast(limitSize));
    }

    const booksQuery = deps.query(baseRef, ...queryConstraints);
    const docsPromise = deps.getDocs(booksQuery);
    const countPromise = deps.countAvailable(normalizedFilters);
    const [snapshot, totalItemsRaw] = await Promise.all([
      docsPromise,
      countPromise,
    ]);
    const docs = extractDocs(snapshot);
    const hasExtra = docs.length > pageSize;

    let pageDocs = docs.slice();
    if (hasExtra) {
      if (direction === 'forward') {
        pageDocs = pageDocs.slice(0, pageSize);
      } else {
        pageDocs = pageDocs.slice(1);
      }
    }

    const items = pageDocs.map((doc) => {
      const data = typeof doc?.data === 'function' ? doc.data() : doc?.data || {};
      return {
        id: doc?.id ?? null,
        ...data,
      };
    });

    const { pageOffset, currentStart } = deriveOffset({
      direction,
      safeOffset,
      currentOffset,
      pageSize,
      itemCount: items.length,
    });

    const totalItems = Number.isFinite(totalItemsRaw)
      ? totalItemsRaw
      : currentStart + items.length;
    const hasPrev = currentStart > 0;
    const hasNext = totalItems > currentStart + items.length;

  return {
    items,
    pageMeta: {
      pageSize,
      count: items.length,
        hasNext,
        hasPrev,
        cursors: {
          start: pageDocs[0] || null,
          end: pageDocs[pageDocs.length - 1] || null,
        },
      },
      offset: pageOffset,
      currentOffset: currentStart,
      totalItems,
    };
  };
}

async function computeSoldCount(deps) {
  const baseRef = deps.collection(deps.db, 'sales');
  const salesQuery = deps.query(
    baseRef,
    deps.where('status', '==', 'sold')
  );
  try {
    if (typeof deps.getCountFromServer === 'function') {
      const snap = await deps.getCountFromServer(salesQuery);
      if (snap && typeof snap.data === 'function') {
        const payload = snap.data();
        if (payload && typeof payload.count === 'number') {
          return payload.count;
        }
      }
      if (snap && typeof snap.count === 'number') {
        return snap.count;
      }
    }
  } catch {
    // If counting fails, fall back to client-side logic below.
  }
  const snap = await deps.getDocs(salesQuery);
  if (snap && typeof snap.size === 'number') {
    return snap.size;
  }
  if (snap && Array.isArray(snap.docs)) {
    return snap.docs.length;
  }
  if (Array.isArray(snap)) {
    return snap.length;
  }
  return 0;
}

export function createSoldBooksDataSource(overrides = {}) {
  const deps = {
    db: firebaseDeps.db,
    collection: firebaseDeps.collection,
    query: firebaseDeps.query,
    where: firebaseDeps.where,
    orderBy: firebaseDeps.orderBy,
    limit: firebaseDeps.limit,
    limitToLast: firebaseDeps.limitToLast,
    startAfter: firebaseDeps.startAfter,
    endBefore: firebaseDeps.endBefore,
    getDocs: firebaseDeps.getDocs,
    getCountFromServer: firebaseDeps.getCountFromServer,
    ...overrides,
  };

  if (typeof deps.countSold !== 'function') {
    deps.countSold = () => computeSoldCount(deps);
  }

  return async function soldBooksDataSource(options = {}) {
    const { request = {}, offset = 0 } = options || {};
    const direction = request.direction === 'backward' ? 'backward' : 'forward';
    const pageSize = clampPageSize(request.pageSize);
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const currentOffset =
      Number.isFinite(request.currentOffset) && request.currentOffset >= 0
        ? request.currentOffset
        : safeOffset;
    const limitSize = pageSize + 1;

    const baseRef = deps.collection(deps.db, 'sales');
    const queryConstraints = [
      deps.where('status', '==', 'sold'),
      deps.orderBy('soldOn', 'desc'),
    ];

    const forwardCursor =
      request.cursorAfter ?? request.cursor ?? null;
    const backwardCursor =
      request.cursorBefore ?? request.cursor ?? null;

    if (direction === 'forward' && forwardCursor) {
      queryConstraints.push(deps.startAfter(forwardCursor));
    } else if (direction === 'backward' && backwardCursor) {
      queryConstraints.push(deps.endBefore(backwardCursor));
    }

    if (direction === 'forward') {
      queryConstraints.push(deps.limit(limitSize));
    } else {
      queryConstraints.push(deps.limitToLast(limitSize));
    }

    const soldQuery = deps.query(baseRef, ...queryConstraints);
    const [snapshot, totalItemsRaw] = await Promise.all([
      deps.getDocs(soldQuery),
      deps.countSold({}),
    ]);
    const docs = extractDocs(snapshot);
    const hasExtra = docs.length > pageSize;

    let pageDocs = docs.slice();
    if (hasExtra) {
      pageDocs =
        direction === 'forward' ? pageDocs.slice(0, pageSize) : pageDocs.slice(1);
    }

    const items = pageDocs.map((doc) => {
      const data =
        typeof doc?.data === 'function' ? doc.data() : doc?.data || {};
      return {
        id: doc?.id ?? null,
        ...data,
      };
    });

    const { pageOffset, currentStart } = deriveOffset({
      direction,
      safeOffset,
      currentOffset,
      pageSize,
      itemCount: items.length,
    });

    const totalItems = Number.isFinite(totalItemsRaw)
      ? totalItemsRaw
      : currentStart + items.length;
    const hasPrev = currentStart > 0;
    const hasNext = totalItems > currentStart + items.length;

    return {
      items,
      pageMeta: {
        pageSize,
        count: items.length,
        hasNext,
        hasPrev,
        cursors: {
          start: pageDocs[0] || null,
          end: pageDocs[pageDocs.length - 1] || null,
        },
      },
      offset: pageOffset,
      currentOffset: currentStart,
      totalItems,
    };
  };
}
