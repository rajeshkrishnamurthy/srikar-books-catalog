import { fireEvent, waitFor } from '@testing-library/dom';
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

describe('SPEC F19-TP5-003: Prev/Next interact with numeric pager', () => {
  test('deep-link to page 3, Next goes to 4, Prev back to 3 with correct highlights', async () => {
    window.location.hash = '#manage-books/available?page=3&pageSize=20&offset=40';

    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs(buildDocs(120)); // 6 pages

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const page3Button = pagination.querySelector(
      'button[data-page-button="3"]'
    );
    expect(page3Button.getAttribute('aria-current')).toBe('page');

    const nextButton = pagination.querySelector('#availablePaginationNext');
    fireEvent.click(nextButton);

    await waitFor(() => {
      const page4Button = pagination.querySelector(
        'button[data-page-button="4"]'
      );
      expect(page4Button.getAttribute('aria-current')).toBe('page');
    });

    const prevButton = pagination.querySelector('#availablePaginationPrev');
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(page3Button.getAttribute('aria-current')).toBe('page');
    });

    const summary = pagination.querySelector('#availablePaginationSummary');
    expect(summary.textContent).toBe('Items 41–60 of 120 available books');
    expect(window.location.hash).toContain('page=3');
  });
});
