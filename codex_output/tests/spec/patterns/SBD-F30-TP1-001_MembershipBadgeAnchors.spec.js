const { createMembershipCountBadgeHarness } = require('../../fixtures/membershipCountBadgeHarness.js');

describe('SPEC SBD-F30-TP1-001: Available book membership badge anchors', () => {
  test('available books list exposes badge anchors and mount API', async () => {
    const harness = await createMembershipCountBadgeHarness();
    const { list, cards, badges, importError, mountError, api } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    expect(list).not.toBeNull();
    expect(list.id).toBe('availableBooksList');
    expect(cards.length).toBeGreaterThan(0);

    badges.forEach((badge) => {
      expect(badge.getAttribute('data-test')).toBe('bundleMembershipBadge');
      expect(badge.hidden).toBe(true);
      expect(badge.textContent).toBe('');
    });

    expect(typeof api?.sync).toBe('function');
    expect(typeof api?.destroy).toBe('function');

    harness.cleanup();
  });
});
