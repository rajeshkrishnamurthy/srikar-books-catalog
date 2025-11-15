import * as dataHelpers from '../../../scripts/helpers/data.js';

function buildShellState({
  itemsCount,
  pageSize,
  totalItems,
  offset,
  hasNext,
  hasPrev,
  isLoading = false,
}) {
  const items =
    itemsCount > 0
      ? Array.from({ length: itemsCount }, (_, index) => ({
          id: `item-${offset + index + 1}`,
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

  return dataHelpers.buildPaginationShellState?.({
    pageMeta: pageState.meta,
    totalItems,
    offset,
    isLoading,
  });
}

describe('UNIT F18-TP2: admin pagination shell state', () => {
  test('F18-TP2-001_FirstPagePrevDisabled', () => {
    const uiState = buildShellState({
      itemsCount: 20,
      pageSize: 20,
      totalItems: 132,
      offset: 0,
      hasNext: true,
      hasPrev: false,
      isLoading: false,
    });

    expect(uiState).toEqual({
      summaryText: 'Items 1–20 of 132',
      prevDisabled: true,
      nextDisabled: false,
      isBusy: false,
    });
  });

  test('F18-TP2-002_LastPageNextDisabled', () => {
    const uiState = buildShellState({
      itemsCount: 20,
      pageSize: 20,
      totalItems: 40,
      offset: 20,
      hasNext: false,
      hasPrev: true,
      isLoading: false,
    });

    expect(uiState).toEqual({
      summaryText: 'Items 21–40 of 40',
      prevDisabled: false,
      nextDisabled: true,
      isBusy: false,
    });
  });

  test('F18-TP2-003_LoadingDisablesBothEnds', () => {
    const uiState = buildShellState({
      itemsCount: 20,
      pageSize: 20,
      totalItems: 132,
      offset: 0,
      hasNext: true,
      hasPrev: false,
      isLoading: true,
    });

    expect(uiState).toEqual({
      summaryText: 'Items 1–20 of 132',
      prevDisabled: true,
      nextDisabled: true,
      isBusy: true,
    });
  });
});
