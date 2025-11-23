const {
  createAvailableBooksMembershipCountsHarness,
  flushCounts
} = require('../../fixtures/availableBooksMembershipCountsHarness.js');

describe('SPEC SBD-F30-TP3-001: Available mount fetches bundle counts on init', () => {
  test('mountAvailableBooksMembershipCounts fetches visible bookIds on init and renders badges', async () => {
    const harness = await createAvailableBooksMembershipCountsHarness({
      countsById: { 'book-1': 2, 'book-2': 0 }
    });
    const {
      cards,
      pagination,
      adapters,
      badgesById,
      importError,
      mountError,
      cleanup
    } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(pagination?.id).toBe('availableBooksPagination');
    expect(cards.length).toBeGreaterThan(0);

    await flushCounts();

    const visibleIds = cards.map((card) => card.getAttribute('data-book-id'));

    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledTimes(1);
    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledWith({ bookIds: visibleIds });

    expect(adapters.formatBundleCount).toHaveBeenCalledWith(2);
    expect(adapters.announceBundleCount).toHaveBeenCalledWith('2 bundles', 'polite');

    expect(badgesById['book-1'].hidden).toBe(false);
    expect(badgesById['book-1'].textContent).toBe('2 bundles');
    expect(badgesById['book-2'].hidden).toBe(true);
    expect(badgesById['book-2'].textContent).toBe('');
    expect(badgesById['book-3'].hidden).toBe(true);
    expect(badgesById['book-3'].textContent).toBe('');

    cleanup();
  });
});
