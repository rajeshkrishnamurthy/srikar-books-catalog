const { createMembershipCountBadgeHarness, flushCounts } = require('../../fixtures/membershipCountBadgeHarness.js');

describe('SPEC SBD-F30-TP1-002: Membership badge shows formatted counts', () => {
  test('positive membership counts show badges with formatted text', async () => {
    const harness = await createMembershipCountBadgeHarness({
      countsById: { 'book-1': 3, 'book-2': 1 }
    });
    const { api, adapters, badgesById, importError, mountError } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api).toBeDefined();

    await api?.sync?.(['book-1', 'book-2']);
    await flushCounts();

    expect(adapters.fetchCounts).toHaveBeenCalledWith({ ids: ['book-1', 'book-2'] });
    expect(adapters.formatCount).toHaveBeenCalledWith(3);
    expect(adapters.formatCount).toHaveBeenCalledWith(1);

    expect(badgesById['book-1'].hidden).toBe(false);
    expect(badgesById['book-1'].textContent).toBe('3 bundles');
    expect(badgesById['book-2'].hidden).toBe(false);
    expect(badgesById['book-2'].textContent).toBe('1 bundle');
    expect(badgesById['book-3'].hidden).toBe(true);

    harness.cleanup();
  });
});
