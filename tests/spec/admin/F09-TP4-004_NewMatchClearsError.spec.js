import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP4-004: Clear error when matches appear', () => {
  test('after a no-match warning, a subsequent valid query clears the message and allows selection', async () => {
    const loadBooks = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'book-1', title: 'Design Systems', supplier: { id: 'sup-1' } },
      ]);

    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks,
    });

    await harness.typeQuery('Unknown');
    expect(harness.msgEl.textContent).toMatch(/no catalog match/i);

    await harness.typeQuery('Design');
    expect(harness.msgEl.textContent.trim()).toBe('');
    const suggestions = harness.getSuggestions();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].dataset.bookId).toBe('book-1');
  });
});
