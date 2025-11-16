import { jest } from '@jest/globals';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import {
  buildPaginationControllerStub,
  buildPaginationControllerFactory,
} from '../../fixtures/paginationControllerStub.js';

describe('SPEC F19-TP3-001: Restore pagination state from location hash', () => {
  test('initInventory reads available pagination params from hash and forwards them to syncFromLocation', async () => {
    window.location.hash =
      '#manage-books/available?page=3&pageSize=50&offset=100&search=astro';

    const controller = buildPaginationControllerStub();
    await createAdminInventoryHarness({
      paginationControllerFactory: buildPaginationControllerFactory(controller),
    });

    expect(controller.syncFromLocation).toHaveBeenCalledWith({
      search: '?page=3&pageSize=50&offset=100&search=astro',
      totalItems: 0,
    });
  });
});
