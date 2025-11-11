import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP1-004: Ignore non-title identifiers', () => {
  test('numeric or SKU-looking input clears suggestions and surfaces guidance to type letters', async () => {
    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks: jest.fn(async () => [
        { id: 'book-1', title: 'Algorithms' },
        { id: 'book-2', title: 'Systems Thinking' },
      ]),
    });

    await harness.typeQuery('12345');

    expect(harness.getSuggestions()).toHaveLength(0);
    expect(harness.msgEl.textContent.toLowerCase()).toContain('type at least');
    expect(harness.bookIdInput.value).toBe('');
  });
});
