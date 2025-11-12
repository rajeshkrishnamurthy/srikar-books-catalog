import { createSalesTitleAutocompleteHarness } from '../../fixtures/salesTitleAutocompleteHarness.js';
import { jest } from '@jest/globals';

describe('SPEC F09-TP4-003: Log unmatched queries', () => {
  test('onNoMatch callback receives the normalized query text once per attempt', async () => {
    const onNoMatch = jest.fn();
    const harness = await createSalesTitleAutocompleteHarness({
      loadBooks: jest.fn(async () => []),
      onNoMatch,
    });

    await harness.typeQuery('  Random   SKU ');

    expect(onNoMatch).toHaveBeenCalledTimes(1);
    expect(onNoMatch).toHaveBeenCalledWith('random sku');
  });
});
