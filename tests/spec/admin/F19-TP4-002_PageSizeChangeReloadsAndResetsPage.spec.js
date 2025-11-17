import { fireEvent, waitFor, within } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

function buildDocs(count = 120) {
  return Array.from({ length: count }, (_, idx) => ({
    id: `book-${idx + 1}`,
    title: `Book ${idx + 1}`,
    author: 'Author',
    category: 'Category',
    binding: 'Paperback',
  }));
}

describe('SPEC F19-TP4-002: Changing page size reloads page 1 and updates hash', () => {
  test('selecting 50 per page fetches 50 rows, resets page to 1, and updates hash with pageSize=50', async () => {
    window.location.hash = '#manage-books/available?page=3&pageSize=20&offset=40';

    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs(buildDocs(120));

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const sizeSelect = pagination.querySelector('#availablePageSize');
    const summary = pagination.querySelector('#availablePaginationSummary');
    const { getByRole } = within(pagination);

    await waitFor(() => {
      expect(summary.textContent).toBe('Items 41–60 of 120 available books');
    });

    fireEvent.change(sizeSelect, { target: { value: '50' } });

    await waitFor(() => {
      expect(summary.textContent).toBe('Items 1–50 of 120 available books');
    });

    const rows = harness.availList.querySelectorAll('.row');
    expect(rows.length).toBe(50);
    const firstRow = rows[0].querySelector('strong');
    expect(firstRow.textContent).toContain('Book 1');

    const nextButton = getByRole('button', { name: /next page/i });
    expect(nextButton.disabled).toBe(false);

    // Hash should show page=1 & pageSize=50
    const hash = window.location.hash;
    expect(hash).toContain('page=1');
    expect(hash).toContain('pageSize=50');
    expect(hash).toContain('offset=0');
  });
});
