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
