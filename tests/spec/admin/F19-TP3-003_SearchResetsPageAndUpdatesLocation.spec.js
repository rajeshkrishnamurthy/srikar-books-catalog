import { fireEvent, waitFor } from '@testing-library/dom';
import { jest } from '@jest/globals';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import {
  buildPaginationControllerStub,
  buildPaginationControllerFactory,
} from '../../fixtures/paginationControllerStub.js';

describe('SPEC F19-TP3-003: Search change resets page and persists to hash', () => {
  test('typing a new header search term setsFilters with the term and updates hash with page=1', async () => {
    window.location.hash = '#manage-books/available?page=3&pageSize=50&offset=100';

    const controller = buildPaginationControllerStub();
    let locationUpdater = null;
    controller.syncToLocation = jest.fn((fn) => {
      locationUpdater = fn;
    });
    controller.setFilters = jest.fn((filters = {}) => {
      locationUpdater?.({
        page: 1,
        pageSize: 50,
        offset: 0,
        filters,
      });
    });

    const harness = await createAdminInventoryHarness({
      paginationControllerFactory: buildPaginationControllerFactory(controller),
    });

    expect(controller.syncToLocation).toHaveBeenCalledWith(expect.any(Function));
    const locationUpdate = controller.syncToLocation.mock.calls[0]?.[0];
    expect(typeof locationUpdate).toBe('function');
    locationUpdate({
      page: 3,
      pageSize: 50,
      offset: 100,
      filters: {},
    });
    window.location.hash = '#manage-books/available?page=3&pageSize=50&offset=100';

    harness.availableSearchInput.value = 'astro';
    fireEvent.input(harness.availableSearchInput);

    await waitFor(() => {
      expect(controller.setFilters).toHaveBeenCalledWith(
        expect.objectContaining({ searchTerm: 'astro' })
      );
    });

    expect(window.location.hash).toBe(
      '#manage-books/available?page=1&pageSize=50&offset=0&search=astro'
    );
  });
});
