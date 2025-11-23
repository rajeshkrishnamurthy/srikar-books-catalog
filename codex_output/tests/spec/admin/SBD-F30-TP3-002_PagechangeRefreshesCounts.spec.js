const {
  createAvailableBooksMembershipCountsHarness,
  flushCounts
} = require('../../fixtures/availableBooksMembershipCountsHarness.js');

describe('SPEC SBD-F30-TP3-002: Pagination refreshes bundle counts after init', () => {
  test('pagechange re-fetches visible bookIds and clears stale badges', async () => {
    const harness = await createAvailableBooksMembershipCountsHarness({
      countsById: { 'book-1': 3 }
    });
    const {
      adapters,
      badgesById,
      dispatchPageChange,
      importError,
      mountError,
      cleanup
    } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    await flushCounts();

    adapters.getBundleMembershipCounts.mockResolvedValueOnce({ 'book-2': 1 });

    dispatchPageChange(['book-2']);
    await flushCounts();

    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledTimes(2);
    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledWith({ bookIds: ['book-2'] });

    expect(badgesById['book-1'].hidden).toBe(true);
    expect(badgesById['book-1'].textContent).toBe('');
    expect(badgesById['book-2'].hidden).toBe(false);
    expect(badgesById['book-2'].textContent).toBe('1 bundle');
    expect(badgesById['book-3'].hidden).toBe(true);

    cleanup();
  });
});
