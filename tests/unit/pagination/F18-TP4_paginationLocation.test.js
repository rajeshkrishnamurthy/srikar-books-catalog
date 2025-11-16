import * as dataHelpers from '../../../scripts/helpers/data.js';

describe('UNIT F18-TP4: pagination state and deep linking', () => {
  test('F18-TP4-001_EncodePageStateIntoHashParams', () => {
    const encoded = dataHelpers.buildPaginationLocationParams?.({
      pageMeta: {
        pageSize: 20,
        count: 20,
        hasNext: true,
        hasPrev: false,
        cursors: {
          start: 'cursor-1',
          end: 'cursor-20',
        },
      },
      offset: 40,
      filters: {
        category: 'fiction',
        q: 'mystery',
      },
    });

    expect(encoded).toEqual({
      page: 3,
      pageSize: 20,
      offset: 40,
      category: 'fiction',
      q: 'mystery',
    });
  });

  test('F18-TP4-002_ParseHashRestoresNearestPageState', () => {
    const decoded = dataHelpers.parsePaginationFromLocation?.({
      search: '?page=10&pageSize=20&offset=180&category=fiction&q=mystery',
      totalItems: 132,
      defaultPageSize: 20,
    });

    expect(decoded).toEqual({
      page: 7,
      pageSize: 20,
      offset: 120,
      filters: {
        category: 'fiction',
        q: 'mystery',
      },
    });
  });

  test('F18-TP4-003_RoundTripKeepsPageAndFiltersStable', () => {
    const encoded = dataHelpers.buildPaginationLocationParams?.({
      pageMeta: {
        pageSize: 25,
        count: 25,
        hasNext: true,
        hasPrev: true,
        cursors: {
          start: 'cursor-26',
          end: 'cursor-50',
        },
      },
      offset: 25,
      filters: {
        category: 'non-fiction',
        q: 'history',
      },
    });

    const search = `?page=${encoded.page}&pageSize=${encoded.pageSize}&offset=${encoded.offset}&category=${encoded.category}&q=${encoded.q}`;

    const decoded = dataHelpers.parsePaginationFromLocation?.({
      search,
      totalItems: 200,
      defaultPageSize: 25,
    });

    expect(decoded).toEqual({
      page: 2,
      pageSize: 25,
      offset: 25,
      filters: {
        category: 'non-fiction',
        q: 'history',
      },
    });
  });
});

