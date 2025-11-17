import { jest } from '@jest/globals';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import { buildAvailableAndSoldControllerFactory } from '../../fixtures/availableSoldControllerFactory.js';

describe('UNIT SBD-F20-TP2-005: Sold pagination syncs location hash', () => {
  beforeEach(() => {
    window.location.hash = '#manage-books/sold';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  test('controller.syncToLocation writes #manage-books/sold with pagination params', async () => {
    const availableController = buildPaginationControllerStub();
    const soldController = buildPaginationControllerStub();
    const updateFns = [];
    soldController.syncToLocation = jest.fn((fn) => {
      if (typeof fn === 'function') {
        updateFns.push(fn);
      }
    });

    const controllerFactory = buildAvailableAndSoldControllerFactory(
      availableController,
      soldController
    );

    await createAdminInventoryHarness({
      paginationControllerFactory: controllerFactory,
    });

    expect(soldController.syncToLocation).toHaveBeenCalledWith(
      expect.any(Function)
    );
    expect(updateFns).toHaveLength(1);

    const updateLocation = updateFns[0];
    updateLocation({
      page: 3,
      pageSize: 25,
      offset: 50,
      filters: { customer: 'anu' },
    });

    expect(window.location.hash).toBe(
      '#manage-books/sold?page=3&pageSize=25&offset=50&customer=anu'
    );
  });
});
