import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP4-001: No-match guidance messaging', () => {
  test('typing an unknown title shows guidance and keeps the hidden bookId empty', async () => {
    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks: jest.fn(async () => []),
    });

    await harness.typeQuery('Obscure Title');

    expect(harness.loadBooks).toHaveBeenCalled();
    expect(harness.msgEl.textContent).toMatch(/no catalog match/i);
    expect(harness.bookIdInput.value).toBe('');
    expect(harness.summaryEl.dataset.empty).toBe('true');
    expect(harness.onBookSelect).not.toHaveBeenCalled();
  });
});
