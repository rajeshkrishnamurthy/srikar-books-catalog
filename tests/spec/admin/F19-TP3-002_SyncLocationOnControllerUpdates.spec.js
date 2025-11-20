import { jest } from '@jest/globals';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import {
  buildPaginationControllerStub,
  buildPaginationControllerFactory,
} from '../../fixtures/paginationControllerStub.js';

describe('SPEC F19-TP3-002: Location updates mirror controller state', () => {
  test('controller.syncToLocation receives an update function that writes page + filters into #manage-books/available', async () => {
    window.location.hash = '#manage-books/available';

    const controller = buildPaginationControllerStub();
    const updateFns = [];
    controller.syncToLocation = jest.fn((fn) => {
      updateFns.push(fn);
    });

    await createAdminInventoryHarness({
      paginationControllerFactory: buildPaginationControllerFactory(controller),
    });

    expect(controller.syncToLocation).toHaveBeenCalledWith(expect.any(Function));
    expect(updateFns).toHaveLength(1);

    const updateLocation = updateFns[0];
    updateLocation({
      page: 2,
      pageSize: 50,
      offset: 50,
      filters: { searchTerm: 'astro' },
    });

    expect(window.location.hash).toBe(
      '#manage-books/available?page=2&pageSize=50&offset=50&search=astro'
    );
  });
});
