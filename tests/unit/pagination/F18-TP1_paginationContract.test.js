import * as dataHelpers from '../../../scripts/helpers/data.js';

describe('UNIT F18-TP1: pagination contract helpers', () => {
  test('F18-TP1-001_ClampAndNormalizeForwardRequests', () => {
    const request = dataHelpers.createPaginationRequest?.({
      pageSize: undefined,
      direction: undefined,
      cursorAfter: 'cursor-start-001',
      defaults: { pageSize: 30, minPageSize: 10, maxPageSize: 50 }
    });

    expect(request).toEqual({
      pageSize: 30,
      direction: 'forward',
      cursorAfter: 'cursor-start-001',
      cursorBefore: null
    });
  });

  test('F18-TP1-002_BackwardRequestsUseCursorBefore', () => {
    const request = dataHelpers.createPaginationRequest?.({
      pageSize: 200,
      direction: 'backward',
      cursorBefore: 'cursor-end-999',
      defaults: { pageSize: 25, minPageSize: 5, maxPageSize: 50 }
    });

    expect(request).toEqual({
      pageSize: 50,
      direction: 'backward',
      cursorAfter: null,
      cursorBefore: 'cursor-end-999'
    });
  });

  test('F18-TP1-003_BuildPaginationStateNormalizesMeta', () => {
    const pageState = dataHelpers.buildPaginationState?.({
      items: [{ id: 'a' }, { id: 'b' }],
      pageSize: 2,
      hasNext: true,
      hasPrev: false,
      nextCursor: 'cursor-b',
      prevCursor: 'cursor-a'
    });

    expect(pageState).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      pageMeta: {
        pageSize: 2,
        count: 2,
        hasNext: true,
        hasPrev: false,
        nextCursor: 'cursor-b',
        prevCursor: 'cursor-a'
      }
    });
  });

  test('F18-TP1-004_ShellStateHandlesEmptyAndBoundaries', () => {
    const emptyState = dataHelpers.buildPaginationShellState?.({
      pageMeta: { count: 0, pageSize: 20, hasNext: false, hasPrev: false },
      totalItems: 0,
      offset: 0,
      isLoading: false
    });
    const lastPageState = dataHelpers.buildPaginationShellState?.({
      pageMeta: { count: 5, pageSize: 20, hasNext: false, hasPrev: true },
      totalItems: 45,
      offset: 40,
      isLoading: false
    });

    expect(emptyState).toEqual({
      summaryText: 'Items 0\u20130 of 0',
      prevDisabled: true,
      nextDisabled: true,
      isBusy: false
    });
    expect(lastPageState).toEqual({
      summaryText: 'Items 41\u201345 of 45',
      prevDisabled: false,
      nextDisabled: true,
      isBusy: false
    });
  });

  test('F18-TP1-005_LocationParamsSerializeFilters', () => {
    const params = dataHelpers.buildPaginationLocationParams?.({
      pageMeta: { pageSize: 25 },
      offset: 75,
      filters: { search: 'python', supplier: 'blore' }
    });

    expect(params).toEqual(
      expect.objectContaining({
        page: 4,
        pageSize: 25,
        offset: 75,
        search: 'python',
        supplier: 'blore'
      })
    );
  });
});
