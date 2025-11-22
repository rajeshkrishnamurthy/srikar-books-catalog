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

describe('SPEC F19-TP5-004: Last page shows the remainder rows', () => {
  test('selecting page 3 with page size 10 renders only the final book and updates summary/hash', async () => {
    window.location.hash = '#manage-books/available';

    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs(buildDocs(21));

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const sizeSelect = pagination.querySelector('#availablePageSize');

    fireEvent.change(sizeSelect, { target: { value: '10' } });

    const page3Button = await waitFor(() =>
      pagination.querySelector('button[data-page-button=\"3\"]')
    );

    fireEvent.click(page3Button);

    await waitFor(() => {
      expect(page3Button.getAttribute('aria-current')).toBe('page');
    });

    const rows = harness.availList.querySelectorAll('.row');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('strong').textContent).toContain('Book 21');

    const summary = pagination.querySelector('#availablePaginationSummary');
    expect(summary.textContent).toBe('Items 21–21 of 21 available books');
    expect(window.location.hash).toContain('page=3');
    expect(window.location.hash).toContain('pageSize=10');
    expect(window.location.hash).toContain('offset=20');
  });
});
