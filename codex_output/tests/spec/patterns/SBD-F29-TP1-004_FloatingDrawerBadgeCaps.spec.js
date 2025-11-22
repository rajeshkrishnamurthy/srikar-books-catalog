const { createFloatingDrawerTriggerHarness } = require('../../fixtures/floatingDrawerTriggerHarness.js');

describe('SPEC SBD-F29-TP1-004: Floating drawer badge caps to two digits', () => {
  test('counts above the max render as 99+ while staying visible', async () => {
    const harness = await createFloatingDrawerTriggerHarness({
      initialCount: 150,
      maxCount: 99
    });
    const { trigger, badge, importError, mountError, adapters } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(adapters.getCount).toHaveBeenCalled();

    expect((badge.textContent || '').trim()).toBe('99+');
    expect(trigger.hidden).toBe(false);

    harness.cleanup();
  });
});
