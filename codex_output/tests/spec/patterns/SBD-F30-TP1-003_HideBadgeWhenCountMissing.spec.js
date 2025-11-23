const { createMembershipCountBadgeHarness, flushCounts } = require('../../fixtures/membershipCountBadgeHarness.js');

describe('SPEC SBD-F30-TP1-003: Membership badge hides for zero or missing counts', () => {
  test('zero or missing membership counts keep badges hidden and cleared', async () => {
    const harness = await createMembershipCountBadgeHarness({
      countsById: { 'book-1': 0 }
    });
    const { api, adapters, badgesById, importError, mountError } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(api).toBeDefined();

    await api?.sync?.(['book-1', 'book-2']);
    await flushCounts();

    expect(adapters.fetchCounts).toHaveBeenCalledWith({ ids: ['book-1', 'book-2'] });

    expect(badgesById['book-1'].hidden).toBe(true);
    expect(badgesById['book-1'].textContent).toBe('');

    expect(badgesById['book-2'].hidden).toBe(true);
    expect(badgesById['book-2'].textContent).toBe('');

    harness.cleanup();
  });
});
