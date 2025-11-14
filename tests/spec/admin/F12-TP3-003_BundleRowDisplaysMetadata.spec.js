import { describe, expect, jest, test } from '@jest/globals';
import { createAdminBundleListHarness } from '../../fixtures/adminBundleListHarness.js';

const legacyBundles = [
  {
    id: 'legacy-1',
    title: 'Legacy Combo',
    supplier: { id: 'sup-9', name: 'Old Supplier' },
    status: 'Draft',
    bookIds: ['legacy-book'],
  },
];

describe('SPEC F12-TP3-003: Hydrate legacy bundles before filtering', () => {
  test('hydrateBundleBooks runs so bundles with only bookIds can still match selections', async () => {
    const hydrateBundleBooks = jest.fn(async (bundle) => {
      if (bundle.id === 'legacy-1') {
        return [{ id: 'legacy-book', title: 'Legacy Title' }];
      }
      return [];
    });

    const harness = await createAdminBundleListHarness({
      bundles: legacyBundles,
      hydrateBundleBooks,
    });

    await harness.selectBook({ id: 'legacy-book', title: 'Legacy Title' });

    expect(hydrateBundleBooks).toHaveBeenCalled();
    expect(harness.resultsText()).toContain('Legacy Combo');
    expect(harness.isEmptyVisible()).toBe(false);
    const toggle = harness.results.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});
