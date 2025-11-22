const {
  createAvailableBooksMembershipCountsHarness,
  flushCounts
} = require('../../fixtures/availableBooksMembershipCountsHarness.js');

describe('SPEC SBD-F30-TP2-002: Bundle membership counts render badges per visible page', () => {
  test('refresh fetches counts for the current page and shows formatted badges', async () => {
    const harness = await createAvailableBooksMembershipCountsHarness({
      countsById: { 'book-1': 4, 'book-2': 1 }
    });
    const { adapters, badgesById, api, importError, mountError, cleanup } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api).toBeDefined();

    await api.refreshBundleMembershipCounts(['book-1', 'book-2']);
    await flushCounts();

    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledWith({
      bookIds: ['book-1', 'book-2']
    });
    expect(adapters.formatBundleCount).toHaveBeenCalledWith(4);
    expect(adapters.formatBundleCount).toHaveBeenCalledWith(1);
    expect(adapters.announceBundleCount).toHaveBeenCalledWith('4 bundles', 'polite');

    expect(badgesById['book-1'].hidden).toBe(false);
    expect(badgesById['book-1'].textContent).toBe('4 bundles');
    expect(badgesById['book-2'].hidden).toBe(false);
    expect(badgesById['book-2'].textContent).toBe('1 bundle');
    expect(badgesById['book-3'].hidden).toBe(true);
    expect(badgesById['book-3'].textContent).toBe('');

    cleanup();
  });
});
