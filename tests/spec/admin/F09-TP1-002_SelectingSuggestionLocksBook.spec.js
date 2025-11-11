import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP1-002: Selecting a suggestion locks the book for the sale line', () => {
  test('clicking a suggestion populates the hidden bookId, updates the summary, and notifies onBookSelect', async () => {
    const selectedBooks = [
      {
        id: 'book-31',
        title: 'Grid Systems',
        supplier: { id: 'sup-1', name: 'Design Depot', location: 'Chennai' },
      },
      { id: 'book-44', title: 'Running Lean' },
    ];
    const onBookSelect = jest.fn();

    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks: jest.fn(async () => selectedBooks),
      onBookSelect,
    });

    await harness.typeQuery('grid');
    const option = harness.findSuggestionByText('Grid Systems');
    expect(option).not.toBeNull();
    if (option) {
      option.click();
    }

    expect(harness.bookIdInput.value).toBe('book-31');
    expect(harness.summaryEl.textContent).toContain('Grid Systems');
    expect(harness.summaryEl.dataset.empty).toBe('false');
    expect(onBookSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'book-31',
        title: 'Grid Systems',
        supplier: expect.objectContaining({ id: 'sup-1' }),
      })
    );
  });
});
