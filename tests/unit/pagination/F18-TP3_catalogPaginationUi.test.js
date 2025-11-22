import * as dataHelpers from '../../../scripts/helpers/data.js';

function buildPageMeta({
  itemsCount,
  pageSize,
  hasNext,
  hasPrev,
  offset,
}) {
  const items =
    itemsCount > 0
      ? Array.from({ length: itemsCount }, (_, index) => ({
          id: `book-${offset + index + 1}`,
        }))
      : [];

  const pageState =
    dataHelpers.buildPaginationState?.({
      items,
      pageSize,
      hasNext,
      hasPrev,
      cursors: itemsCount
        ? {
            start: `cursor-${offset + 1}`,
            end: `cursor-${offset + itemsCount}`,
          }
        : {
            start: null,
            end: null,
          },
    }) ||
    {
      items,
      meta: {
        pageSize,
        count: items.length,
        hasNext: Boolean(hasNext),
        hasPrev: Boolean(hasPrev),
        cursors: {
          start: itemsCount ? `cursor-${offset + 1}` : null,
          end: itemsCount ? `cursor-${offset + itemsCount}` : null,
        },
      },
    };

  return pageState.meta;
}

describe('UNIT F18-TP3: public catalog pagination UI', () => {
  test('F18-TP3-001_FirstPageUsesPagerSummary', () => {
    const pageMeta = buildPageMeta({
      itemsCount: 20,
      pageSize: 20,
      hasNext: true,
      hasPrev: false,
      offset: 0,
    });

    const uiState = dataHelpers.buildCatalogPaginationUi?.({
      pageMeta,
      totalItems: 132,
      offset: 0,
      mode: 'pager',
      activeTab: 'fiction',
      isLoading: false,
    });

    expect(uiState).toEqual({
      summaryText: 'Items 1–20 of 132',
      mode: 'pager',
      hasMore: true,
    });
  });

  test('F18-TP3-002_LaterPageKeepsSamePatternAcrossTabs', () => {
    const pageMeta = buildPageMeta({
      itemsCount: 20,
      pageSize: 20,
      hasNext: true,
      hasPrev: true,
      offset: 20,
    });

    const fictionState = dataHelpers.buildCatalogPaginationUi?.({
      pageMeta,
      totalItems: 132,
      offset: 20,
      mode: 'pager',
      activeTab: 'fiction',
      isLoading: false,
    });

    const childrenState = dataHelpers.buildCatalogPaginationUi?.({
      pageMeta,
      totalItems: 132,
      offset: 20,
      mode: 'pager',
      activeTab: 'children',
      isLoading: false,
    });

    expect(fictionState).toEqual({
      summaryText: 'Items 21–40 of 132',
      mode: 'pager',
      hasMore: true,
    });

    expect(childrenState).toEqual(fictionState);
  });

  test('F18-TP3-003_LoadMoreModeUsesFriendlyLabel', () => {
    const pageMeta = buildPageMeta({
      itemsCount: 20,
      pageSize: 20,
      hasNext: true,
      hasPrev: false,
      offset: 0,
    });

    const uiState = dataHelpers.buildCatalogPaginationUi?.({
      pageMeta,
      totalItems: 132,
      offset: 0,
      mode: 'loadMore',
      activeTab: 'non-fiction',
      isLoading: false,
    });

    expect(uiState).toEqual({
      summaryText: 'Items 1–20 of 132',
      mode: 'loadMore',
      hasMore: true,
      loadMoreLabel: 'Load more books (21–40 of 132)',
    });
  });
}
);

