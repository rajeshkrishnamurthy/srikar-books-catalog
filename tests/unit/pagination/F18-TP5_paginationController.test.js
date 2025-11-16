import { jest } from '@jest/globals';
import * as dataHelpers from '../../../scripts/helpers/data.js';

describe('UNIT F18-TP5: pagination controller abstraction', () => {
  test('F18-TP5-001_ExposesMinimalControllerApi', () => {
    const controller = dataHelpers.createPaginationController?.({
      dataSource: jest.fn(),
      defaultPageSize: 20,
      initialFilters: { category: 'fiction' },
      mode: 'pager'
    });

    expect(controller).toEqual(
      expect.objectContaining({
        getUiState: expect.any(Function),
        goNext: expect.any(Function),
        goPrev: expect.any(Function),
        loadMore: expect.any(Function),
        setFilters: expect.any(Function),
        syncFromLocation: expect.any(Function),
        syncToLocation: expect.any(Function)
      })
    );
  });

  test('F18-TP5-002_UsesDataSourceForPageRequests', () => {
    const dataSource = jest.fn();

    const controller = dataHelpers.createPaginationController?.({
      dataSource,
      defaultPageSize: 20,
      initialFilters: { category: 'fiction' },
      mode: 'pager'
    }) || null;

    controller?.goNext?.();

    expect(dataSource).toHaveBeenCalled();
  });

  test('F18-TP5-003_SyncFromLocationDelegatesToSharedParsers', () => {
    const dataSource = jest.fn();

    const controller = dataHelpers.createPaginationController?.({
      dataSource,
      defaultPageSize: 20,
      initialFilters: { category: 'fiction' },
      mode: 'pager'
    }) || null;

    controller?.syncFromLocation?.({
      search: '?page=3&pageSize=20&offset=40&category=fiction&q=mystery',
      totalItems: 132
    });

    expect(dataSource).toHaveBeenCalled();
  });
});
