import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

function buildDocs(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `book-${index + 1}`,
    title: `Book ${index + 1}`,
    author: 'Author',
    category: 'Category',
    binding: 'Paperback',
  }));
}

describe('SPEC F19-TP5-001: Numeric pager renders the full page count', () => {
  test('pagination row shows Prev, numeric buttons, Next, and the page-size select in one row', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs(buildDocs(85)); // 5 pages at 20 rows per page

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    expect(pagination).not.toBeNull();

    const pagesContainer = pagination.querySelector('[data-pagination-pages]');
    expect(pagesContainer).not.toBeNull();

    const pageButtons = pagesContainer.querySelectorAll(
      'button[data-page-button]'
    );
    expect(pageButtons).toHaveLength(5);
    expect(pageButtons[0].textContent).toBe('1');
    expect(pageButtons[pageButtons.length - 1].textContent).toBe('5');
    expect(pageButtons[0].getAttribute('aria-current')).toBe('page');

    const pageSizeSelect = pagination.querySelector('#availablePageSize');
    expect(pageSizeSelect).not.toBeNull();

    const prevButton = pagination.querySelector('#availablePaginationPrev');
    const nextButton = pagination.querySelector('#availablePaginationNext');
    expect(prevButton).not.toBeNull();
    expect(nextButton).not.toBeNull();
  });
});
