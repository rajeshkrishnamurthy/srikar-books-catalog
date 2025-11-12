import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP4-002: Block Enter key when no matches exist', () => {
  test('pressing Enter with zero suggestions reiterates the guidance and never selects a book', async () => {
    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks: jest.fn(async () => []),
    });

    await harness.typeQuery('Missing Book');
    harness.pressKey('Enter');

    expect(harness.msgEl.textContent).toMatch(/no catalog match/i);
    expect(harness.bookIdInput.value).toBe('');
    expect(harness.onBookSelect).not.toHaveBeenCalled();
  });
});
