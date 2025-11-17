import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

function buildDocs(count = 80) {
  return Array.from({ length: count }, (_, idx) => ({
    id: `book-${idx + 1}`,
    title: `Book ${idx + 1}`,
    author: 'Author',
    category: 'Category',
    binding: 'Paperback',
  }));
}

describe('SPEC F19-TP4-003: Selected page size persists across reloads (hash/restore)', () => {
  test('changing to 50 per page updates hash and a new harness load restores that size before paging', async () => {
    window.location.hash = '#manage-books/available';

    const firstHarness = await createAdminInventoryHarness();
    firstHarness.emitAvailableDocs(buildDocs(80));

    const firstPagination = firstHarness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const firstSelect = firstPagination.querySelector('#availablePageSize');

    fireEvent.change(firstSelect, { target: { value: '50' } });

    await waitFor(() => {
      expect(window.location.hash).toContain('pageSize=50');
    });

    const secondHarness = await createAdminInventoryHarness();
    secondHarness.emitAvailableDocs(buildDocs(80));

    const pagination = secondHarness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const sizeSelect = pagination.querySelector('#availablePageSize');
    const summary = pagination.querySelector('#availablePaginationSummary');

    await waitFor(() => {
      expect(sizeSelect.value).toBe('50');
      expect(summary.textContent).toBe('Items 1–50 of 80 available books');
    });
  });
});
