const { createFloatingDrawerTriggerHarness } = require('../../fixtures/floatingDrawerTriggerHarness.js');

describe('SPEC SBD-F29-TP1-001: Floating drawer trigger anchors', () => {
  test('mount exposes trigger and badge anchors with aria label and sync API', async () => {
    const harness = await createFloatingDrawerTriggerHarness({
      initialCount: 0,
      ariaLabel: 'Open bundle drawer'
    });

    const { importError, mountError, trigger, badge, adapters, api } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    expect(trigger).not.toBeNull();
    expect(trigger.id).toBe('floatingDrawerTrigger');
    expect(trigger.getAttribute('aria-label')).toBe('Open bundle drawer');

    expect(badge).not.toBeNull();
    expect(badge.id).toBe('floatingDrawerBadge');

    expect(adapters.getCount).toHaveBeenCalled();
    expect(typeof api?.syncCount).toBe('function');
    expect(typeof api?.destroy).toBe('function');

    harness.cleanup();
  });
});
