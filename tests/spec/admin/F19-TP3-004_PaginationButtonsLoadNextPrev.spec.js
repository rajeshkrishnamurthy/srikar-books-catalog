import { fireEvent, waitFor, within } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

function buildDocs(count = 45) {
  return Array.from({ length: count }, (_, index) => ({
    id: `book-${index + 1}`,
    title: `Book ${index + 1}`,
    author: 'Test Author',
    category: 'Fiction',
    binding: 'Paperback',
  }));
}

function expectHashIncludes(params = {}) {
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  const query = queryIndex >= 0 ? hash.slice(queryIndex + 1) : '';
  const search = new URLSearchParams(query);
  Object.entries(params).forEach(([key, value]) => {
    expect(search.get(key)).toBe(String(value));
  });
}

describe('SPEC F19-TP3-004: Pagination buttons fetch next/previous slices', () => {
  test('clicking Next then Previous refreshes rows, summary text, and hash params', async () => {
    window.location.hash = '#manage-books/available';

    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs(buildDocs(45));

    await waitFor(() => {
      expect(harness.availList.querySelectorAll('.row').length).toBe(20);
    });

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const { getByRole } = within(pagination);
    const nextButton = getByRole('button', { name: /next page/i });
    const prevButton = getByRole('button', { name: /previous page/i });
    const summary = pagination.querySelector('#availablePaginationSummary');

    expect(summary.textContent).toBe('Items 1–20 of 45 available books');
    expect(prevButton.disabled).toBe(true);

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(summary.textContent).toBe('Items 21–40 of 45 available books');
    });
    expectHashIncludes({ page: 2, offset: 20, pageSize: 20 });
    const firstNextRow = harness.availList.querySelector('.row strong');
    expect(firstNextRow).not.toBeNull();
    expect(firstNextRow.textContent).toContain('Book 21');
    expect(prevButton.disabled).toBe(false);

    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(summary.textContent).toBe('Items 1–20 of 45 available books');
    });
    expectHashIncludes({ page: 1, offset: 0 });
    const firstPrevRow = harness.availList.querySelector('.row strong');
    expect(firstPrevRow).not.toBeNull();
    expect(firstPrevRow.textContent).toContain('Book 1');
  });
});
