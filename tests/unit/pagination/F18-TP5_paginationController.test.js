import { jest } from '@jest/globals';
import * as dataHelpers from '../../../scripts/helpers/data.js';

describe('UNIT F18-TP5: pagination controller abstraction', () => {
  test('F18-TP5-001_ParseLocationAdapterBootstrapsState', () => {
    const parseLocation = jest.fn(() => ({
      pageSize: 15,
      direction: 'forward',
      cursorAfter: 'cursor-start',
      offset: 45,
      filters: { tab: 'available' }
    }));
    const dataSource = jest.fn().mockResolvedValue({
      pageMeta: { pageSize: 15, count: 0, hasNext: false, hasPrev: false },
      currentOffset: 45,
      offset: 45,
      totalItems: 150
    });

    const controller = dataHelpers.createPaginationController?.({
      adapters: { parseLocation },
      dataSource,
      defaultPageSize: 25
    });

    controller?.syncFromLocation?.();

    expect(parseLocation).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenCalled();
  });

  test('F18-TP5-002_SyncLocationAdapterReceivesStateSnapshots', () => {
    const syncLocation = jest.fn();
    const dataSource = jest.fn(() => ({
      pageMeta: { pageSize: 20, count: 20, hasNext: true, hasPrev: false },
      currentOffset: 20,
      offset: 20,
      totalItems: 200
    }));

    const controller = dataHelpers.createPaginationController?.({
      adapters: { syncLocation },
      dataSource,
      defaultPageSize: 20
    });

    controller?.goNext?.();

    expect(syncLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.any(Number),
        pageSize: 20,
        offset: expect.any(Number)
      })
    );
  });

  test('F18-TP5-003_PageSizeOptionsClampRequests', () => {
    const dataSource = jest.fn(() => ({
      pageMeta: { pageSize: 10, count: 0, hasNext: false, hasPrev: false },
      currentOffset: 0,
      offset: 0,
      totalItems: 0
    }));

    const controller = dataHelpers.createPaginationController?.({
      dataSource,
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50]
    });

    controller?.setPageSize?.(13);

    const lastCall = dataSource.mock.calls[dataSource.mock.calls.length - 1]?.[0];
    expect(lastCall.request).toEqual(
      expect.objectContaining({
        pageSize: 20
      })
    );
  });

  test('F18-TP5-004_LastWriteWinsIgnoresStaleResponses', async () => {
    const pending = [];
    const dataSource = jest.fn(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        })
    );
    const controller = dataHelpers.createPaginationController?.({
      dataSource,
      defaultPageSize: 20
    });

    controller?.goNext?.();
    controller?.goNext?.();

    expect(pending).toHaveLength(2);

    pending[1]({
      pageMeta: { pageSize: 20, count: 20, hasNext: true, hasPrev: true },
      currentOffset: 40,
      offset: 40,
      totalItems: 400
    });
    await Promise.resolve();

    pending[0]({
      pageMeta: { pageSize: 20, count: 20, hasNext: true, hasPrev: false },
      currentOffset: 20,
      offset: 20,
      totalItems: 400
    });
    await Promise.resolve();

    expect(controller?.getUiState?.()).toEqual(
      expect.objectContaining({ currentOffset: 40 })
    );
  });

  test('F18-TP5-005_FiltersResetCursorsAndBusyState', async () => {
    const responses = [
      {
        pageMeta: {
          pageSize: 20,
          count: 20,
          hasNext: true,
          hasPrev: false,
          cursors: { start: 'cursor-1', end: 'cursor-20' }
        },
        currentOffset: 20,
        offset: 20,
        totalItems: 120
      },
      {
        pageMeta: {
          pageSize: 20,
          count: 20,
          hasNext: true,
          hasPrev: false,
          cursors: { start: 'cursor-21', end: 'cursor-40' }
        },
        currentOffset: 0,
        offset: 0,
        totalItems: 120
      }
    ];
    const dataSource = jest.fn(() => Promise.resolve(responses.shift()));
    const onStateChange = jest.fn();

    const controller = dataHelpers.createPaginationController?.({
      dataSource,
      defaultPageSize: 20,
      onStateChange
    });

    controller?.goNext?.();
    await Promise.resolve();

    controller?.setFilters?.({ search: 'rare' });

    const lastOnStateChange = onStateChange.mock.calls[onStateChange.mock.calls.length - 1]?.[0];
    expect(lastOnStateChange).toEqual(expect.objectContaining({ isLoading: true }));

    const lastCall = dataSource.mock.calls[dataSource.mock.calls.length - 1]?.[0];
    expect(lastCall.request.cursorAfter).toBeNull();
    expect(lastCall.request.cursorBefore).toBeNull();
  });

  test('F18-TP5-006_UiStateExposesItemsFromDataSource', async () => {
    const pageItems = [{ id: 'book-1' }, { id: 'book-2' }];
    const dataSource = jest.fn(() =>
      Promise.resolve({
        items: pageItems,
        pageMeta: {
          pageSize: 20,
          count: pageItems.length,
          hasNext: true,
          hasPrev: false
        },
        currentOffset: 0,
        offset: pageItems.length,
        totalItems: 200
      })
    );
    const onStateChange = jest.fn();

    const controller = dataHelpers.createPaginationController?.({
      dataSource,
      defaultPageSize: 20,
      onStateChange
    });

    controller?.goNext?.();
    await Promise.resolve();
    await Promise.resolve();

    const uiState = controller?.getUiState?.();
    expect(uiState?.items).toEqual(pageItems);

    const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1]?.[0];
    expect(lastCall?.items).toEqual(pageItems);
  });
});
