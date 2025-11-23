const {
  createAvailableBooksMembershipCountsHarness,
  flushCounts
} = require('../../fixtures/availableBooksMembershipCountsHarness.js');

describe('SPEC SBD-F30-TP2-001: Available pagination refreshes bundle membership counts', () => {
  test('pagechange on #availableBooksPagination batches visible bookIds into the adapter call', async () => {
    const harness = await createAvailableBooksMembershipCountsHarness();
    const {
      pagination,
      adapters,
      api,
      importError,
      mountError,
      dispatchPageChange,
      cleanup
    } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    expect(pagination).not.toBeNull();
    expect(pagination.id).toBe('availableBooksPagination');
    expect(typeof api?.refreshBundleMembershipCounts).toBe('function');

    dispatchPageChange(['book-1', 'book-2']);
    await flushCounts();

    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledTimes(1);
    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledWith({
      bookIds: ['book-1', 'book-2']
    });

    cleanup();
  });
});
