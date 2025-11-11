import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP1-003: Keyboard navigation and focus handling', () => {
  test('Arrow keys move the active option and Enter selects it just like the F08 lookup bridge', async () => {
    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks: jest.fn(async () => [
        { id: 'book-1', title: 'Design of Everyday Things' },
        { id: 'book-2', title: 'Design Sprint' },
        { id: 'book-3', title: 'Design Patterns' },
      ]),
    });

    await harness.typeQuery('design');
    harness.pressKey('ArrowDown');
    harness.pressKey('ArrowDown');

    const active = harness.getActiveSuggestion();
    expect(active).not.toBeNull();
    expect(active?.dataset.bookId).toBe('book-2');

    harness.pressKey('Enter');

    expect(harness.bookIdInput.value).toBe('book-2');
    expect(harness.summaryEl.textContent).toContain('Design Sprint');
  });
});
