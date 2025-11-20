import { waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

function buildDocs(count = 30) {
  return Array.from({ length: count }, (_, index) => ({
    id: `book-${index + 1}`,
    title: `Book ${index + 1}`,
    author: 'Test Author',
    category: 'Fiction',
    binding: 'Paperback',
  }));
}

describe('SPEC F19-TP3-005: Deep link restores requested page and size', () => {
  test('hash-defined page + pageSize render once snapshots arrive', async () => {
    window.location.hash =
      '#manage-books/available?page=2&pageSize=10&offset=10';

    const harness = await createAdminInventoryHarness();
    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    const summary = pagination.querySelector('#availablePaginationSummary');

    harness.emitAvailableDocs(buildDocs(25));

    await waitFor(() => {
      expect(summary.textContent).toBe('Items 11–20 of 25 available books');
    });

    const rows = harness.availList.querySelectorAll('.row');
    expect(rows.length).toBe(10);
    expect(rows[0].querySelector('strong').textContent).toContain('Book 11');
    expect(window.location.hash).toBe(
      '#manage-books/available?page=2&pageSize=10&offset=10'
    );
  });
});
