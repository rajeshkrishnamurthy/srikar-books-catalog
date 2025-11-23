const { createMembershipCountBadgeHarness, flushCounts } = require('../../fixtures/membershipCountBadgeHarness.js');

describe('SPEC SBD-F30-TP1-004: Membership badges refresh with pagination', () => {
  test('sync refresh clears stale badges and updates the visible page', async () => {
    const harness = await createMembershipCountBadgeHarness();
    const { api, adapters, badgesById, importError, mountError } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api).toBeDefined();

    adapters.fetchCounts.mockResolvedValueOnce({ 'book-1': 2, 'book-2': 1 });
    await api?.sync?.(['book-1', 'book-2']);
    await flushCounts();

    adapters.fetchCounts.mockResolvedValueOnce({ 'book-3': 4 });
    await api?.sync?.(['book-3']);
    await flushCounts();

    expect(adapters.fetchCounts).toHaveBeenCalledWith({ ids: ['book-1', 'book-2'] });
    expect(adapters.fetchCounts).toHaveBeenCalledWith({ ids: ['book-3'] });

    expect(badgesById['book-1'].hidden).toBe(true);
    expect(badgesById['book-1'].textContent).toBe('');
    expect(badgesById['book-2'].hidden).toBe(true);
    expect(badgesById['book-2'].textContent).toBe('');

    expect(badgesById['book-3'].hidden).toBe(false);
    expect(badgesById['book-3'].textContent).toBe('4 bundles');

    harness.cleanup();
  });
});
