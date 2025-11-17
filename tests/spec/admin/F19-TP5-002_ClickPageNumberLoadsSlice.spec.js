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

describe('SPEC F19-TP5-002: Clicking a numeric page loads that slice', () => {
  test('clicking page 3 highlights button, updates rows, summary, and hash', async () => {
    window.location.hash = '#manage-books/available';

    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs(buildDocs(80)); // 4 pages

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const pageButton = pagination.querySelector(
      'button[data-page-button="3"]'
    );
    expect(pageButton).not.toBeNull();

    fireEvent.click(pageButton);

    await waitFor(() => {
      expect(pageButton.getAttribute('aria-current')).toBe('page');
    });

    const summary = pagination.querySelector('#availablePaginationSummary');
    expect(summary.textContent).toBe('Items 41–60 of 80 available books');

    const rows = harness.availList.querySelectorAll('.row');
    expect(rows.length).toBe(20);
    const firstRow = rows[0].querySelector('strong');
    expect(firstRow.textContent).toContain('Book 41');

    expect(window.location.hash).toContain('page=3');
    expect(window.location.hash).toContain('offset=40');
  });
});
