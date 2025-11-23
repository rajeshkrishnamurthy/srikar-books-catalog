const {
  createAvailableBooksMembershipCountsHarness,
  flushCounts
} = require('../../fixtures/availableBooksMembershipCountsHarness.js');

describe('SPEC SBD-F30-TP3-003: Refresh API keeps zero-count badges hidden', () => {
  test('refreshBundleMembershipCounts stays callable after init and hides zero or missing counts', async () => {
    const harness = await createAvailableBooksMembershipCountsHarness({
      countsById: { 'book-1': 1 }
    });
    const {
      api,
      adapters,
      badgesById,
      importError,
      mountError,
      cleanup
    } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(typeof api?.refreshBundleMembershipCounts).toBe('function');

    await flushCounts();

    adapters.getBundleMembershipCounts.mockResolvedValueOnce({ 'book-3': 5, 'book-1': 0 });

    await api.refreshBundleMembershipCounts(['book-1', 'book-3']);
    await flushCounts();

    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledTimes(2);
    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledWith({
      bookIds: ['book-1', 'book-3']
    });

    expect(adapters.formatBundleCount).toHaveBeenCalledWith(5);
    expect(adapters.announceBundleCount).toHaveBeenCalledWith('5 bundles', 'polite');

    expect(badgesById['book-1'].hidden).toBe(true);
    expect(badgesById['book-1'].textContent).toBe('');
    expect(badgesById['book-3'].hidden).toBe(false);
    expect(badgesById['book-3'].textContent).toBe('5 bundles');

    cleanup();
  });
});
