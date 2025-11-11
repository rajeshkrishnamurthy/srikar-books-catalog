import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP1-001: Catalog title autocomplete filters matches', () => {
  test('typing at least two letters shows the best-matching titles and caps to max results', async () => {
    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks: jest.fn(async () => [
        { id: 'book-1', title: 'Design Systems Handbook' },
        { id: 'book-2', title: 'Accessible Design Patterns' },
        { id: 'book-3', title: 'Algorithms Unlocked' },
        { id: 'book-4', title: 'Deep Work' },
      ]),
      maxResults: 3,
    });

    await harness.typeQuery('des');

    expect(harness.loadBooks).toHaveBeenCalledTimes(1);
    const suggestions = harness.getSuggestions();
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].textContent).toContain('Design Systems Handbook');
    expect(suggestions[0].dataset.bookId).toBe('book-1');
    expect(suggestions[1].textContent).toContain('Accessible Design Patterns');
    expect(suggestions[2].textContent).toContain('Deep Work');
  });
});
