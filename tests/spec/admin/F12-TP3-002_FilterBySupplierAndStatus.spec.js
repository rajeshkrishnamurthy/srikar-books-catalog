import { describe, expect, test } from '@jest/globals';
import { createAdminBundleListHarness } from '../../fixtures/adminBundleListHarness.js';

describe('SPEC F12-TP3-002: Supplier/status filters stack with selection', () => {
  test('filters combine with selected book ID', async () => {
    const harness = await createAdminBundleListHarness();

    await harness.selectBook({ id: 'book-3', title: 'Mars Colony' });

    await harness.filterSupplier('sup-2');
    await harness.filterStatus('Published');

    const text = harness.resultsText();
    expect(text).toContain('Sci-Fi Combo');
    expect(text).not.toContain('Magic Starter Pack');
    expect(harness.isEmptyVisible()).toBe(false);

    await harness.filterSupplier('sup-1');
    expect(harness.isEmptyVisible()).toBe(true);
  });
});
