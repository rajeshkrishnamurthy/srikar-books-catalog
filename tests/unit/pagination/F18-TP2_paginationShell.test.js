import * as dataHelpers from '../../../scripts/helpers/data.js';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';
import { buildAvailableAndSoldControllerFactory } from '../../fixtures/availableSoldControllerFactory.js';

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
      nextCursor: itemsCount ? `cursor-${offset + itemsCount}` : null,
      prevCursor: itemsCount ? `cursor-${offset + 1}` : null,
    }) ||
    {
      items,
      pageMeta: {
        pageSize,
        count: items.length,
        hasNext: Boolean(hasNext),
        hasPrev: Boolean(hasPrev),
        nextCursor: itemsCount ? `cursor-${offset + itemsCount}` : null,
        prevCursor: itemsCount ? `cursor-${offset + 1}` : null,
      },
    };

  const pageMeta = pageState.pageMeta || pageState.meta;

  return dataHelpers.buildPaginationShellState?.({
    pageMeta,
    totalItems,
    offset,
    isLoading,
  });
}

async function renderAvailableShellWithController({
  availableController = buildPaginationControllerStub(),
  soldController = buildPaginationControllerStub(),
} = {}) {
  const factory = buildAvailableAndSoldControllerFactory(
    availableController,
    soldController
  );

  const harness = await createAdminInventoryHarness({
    paginationControllerFactory: factory,
  });

  return {
    harness,
    availableController,
    soldController,
  };
}

describe('UNIT F18-TP2: admin pagination shell state + DOM pattern', () => {
  test('F18-TP2-001_BusyStateDisablesPrevNext', () => {
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
      summaryText: 'Items 1\u201320 of 132',
      prevDisabled: true,
      nextDisabled: true,
      isBusy: true,
    });
  });

  test('F18-TP2-002_NumericPagerCompressesRanges', async () => {
    const availableController = buildPaginationControllerStub([
      {
        summaryText: 'Items 41\u201360 of 200',
        prevDisabled: false,
        nextDisabled: false,
        isBusy: false,
        totalItems: 200,
        currentOffset: 40,
        totalPages: 10,
        currentPage: 5,
        pageMeta: { pageSize: 20, count: 20, hasNext: true, hasPrev: true },
      },
    ]);

    await renderAvailableShellWithController({ availableController });
    availableController.__config?.onStateChange?.();

    const container = document.querySelector('[data-available-pagination]');
    const ellipses = container.querySelectorAll('.pagination-ellipsis');
    const currentButton = container.querySelector(
      '[data-pagination-pages] button[aria-current="page"]'
    );

    expect(ellipses.length).toBeGreaterThanOrEqual(2);
    expect(currentButton?.textContent).toBe('5');
  });

  test('F18-TP2-003_NumericButtonsCallGoToPage', async () => {
    const availableController = buildPaginationControllerStub([
      {
        summaryText: 'Items 1\u201320 of 200',
        prevDisabled: false,
        nextDisabled: false,
        isBusy: false,
        totalItems: 200,
        currentOffset: 0,
        totalPages: 5,
        currentPage: 1,
        pageMeta: { pageSize: 20, count: 20, hasNext: true, hasPrev: false },
      },
    ]);

    await renderAvailableShellWithController({ availableController });
    availableController.__config?.onStateChange?.();

    const container = document.querySelector('[data-available-pagination]');
    const targetButton = container.querySelector(
      '[data-pagination-pages] button[data-page-button="4"]'
    );
    targetButton?.click();

    expect(availableController.goToPage).toHaveBeenCalledWith(4);
  });

  test('F18-TP2-004_PageSizeSelectDelegatesAndResyncs', async () => {
    const availableController = buildPaginationControllerStub([
      {
        summaryText: 'Items 1\u201320 of 132',
        prevDisabled: true,
        nextDisabled: false,
        isBusy: false,
        totalItems: 132,
        currentOffset: 0,
        totalPages: 7,
        currentPage: 1,
        pageMeta: { pageSize: 20, count: 20, hasNext: true, hasPrev: false },
      },
    ]);

    const { harness } = await renderAvailableShellWithController({
      availableController,
    });

    availableController.__config?.onStateChange?.();

    const select = harness.pageSizeSelect;
    select.value = '50';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(availableController.setPageSize).toHaveBeenCalledWith(50);
  });

  test('F18-TP2-005_LoadMoreModeProvidesButton', async () => {
    const availableController = buildPaginationControllerStub([
      {
        summaryText: 'Items 21\u201340 of 132',
        prevDisabled: false,
        nextDisabled: false,
        isBusy: false,
        mode: 'loadMore',
        loadMoreLabel: 'Load more (41\u201360 of 132)',
        totalItems: 132,
        currentOffset: 20,
        totalPages: 7,
        currentPage: 2,
        pageMeta: { pageSize: 20, count: 20, hasNext: true, hasPrev: true },
      },
    ]);

    await renderAvailableShellWithController({ availableController });
    availableController.__config?.onStateChange?.();

    const loadMoreButton = document.querySelector(
      '[data-available-pagination] [data-pagination="load-more"]'
    );
    expect(loadMoreButton).toBeTruthy();

    loadMoreButton?.dispatchEvent(new Event('click'));
    expect(availableController.loadMore).toHaveBeenCalledTimes(1);
  });
});
