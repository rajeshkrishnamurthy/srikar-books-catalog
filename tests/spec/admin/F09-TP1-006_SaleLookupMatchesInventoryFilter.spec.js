import { waitFor } from '@testing-library/dom';
import { jest } from '@jest/globals';
import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';

const sampleBooks = [
  { id: 'book-1', title: 'Deep Work', author: 'Cal Newport', isbn: '1234567890' },
  { id: 'book-2', title: 'Design of Everyday Things', author: 'Don Norman', isbn: '0987654321' },
  { id: 'book-3', title: 'Atomic Habits', author: 'James Clear', isbn: '1111111111' },
];

function inventoryMatches(book, query) {
  const term = query.trim().toLowerCase();
  const fields = [book.title, book.author, book.isbn].map((value) =>
    String(value || '').toLowerCase()
  );
  return fields.some((field) => field.includes(term));
}

describe('SPEC F09-TP1-006: Record sale lookup matches inventory filter results', () => {
  test('autocomplete suggestions only include the same matches as the inventory search', async () => {
    const loadBooks = jest.fn(async () => sampleBooks);
    const harness = await createSalesTitleAutocompleteHarness({ loadBooks });

    await harness.typeQuery('de');
    await waitFor(() => expect(harness.getSuggestions()).toHaveLength(2));

    const suggestionIds = harness.getSuggestions().map((option) => option.dataset.bookId);
    const expected = sampleBooks.filter((book) => inventoryMatches(book, 'de')).map((book) => book.id);

    expect(suggestionIds).toEqual(expected);
  });
});
