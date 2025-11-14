import { describe, expect, test } from '@jest/globals';
import { createAdminBundleListHarness } from '../../fixtures/adminBundleListHarness.js';

describe('SPEC F12-TP3-001: Autocomplete selection filters bundles', () => {
  test('only selected book IDs filter results; typing alone does nothing; clearing restores list', async () => {
    const harness = await createAdminBundleListHarness();

    // Book lookup helper should be initialised with the search input.
    expect(harness.lookup.factory).toHaveBeenCalledTimes(1);
    const config = harness.lookup.latestConfig();
    expect(config?.input?.id).toBe('bundleSearchInput');

    // Typing without selection should not filter results.
    await harness.search('Magic');
    expect(harness.resultsText()).toContain('Magic Starter Pack');
    expect(harness.resultsText()).toContain('Sci-Fi Combo');

    // Selecting an autocomplete item filters by book ID.
    await harness.selectBook({ id: 'book-1', title: 'Magic Tree House' });
    expect(harness.resultsText()).toContain('Magic Starter Pack');
    expect(harness.resultsText()).not.toContain('Sci-Fi Combo');
    expect(harness.chipVisible()).toBe(true);
    expect(harness.chipText()).toContain('Magic Tree House');

    // Clearing the selection restores the full list.
    await harness.clearChip();
    expect(harness.resultsText()).toContain('Magic Starter Pack');
    expect(harness.resultsText()).toContain('Sci-Fi Combo');
    expect(harness.chipVisible()).toBe(false);
  });
});
