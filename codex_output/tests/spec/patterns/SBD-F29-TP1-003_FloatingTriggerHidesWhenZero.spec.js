const { createFloatingDrawerTriggerHarness } = require('../../fixtures/floatingDrawerTriggerHarness.js');

function isHidden(el) {
  const style = getComputedStyle(el);
  return el.hidden || style.display === 'none' || style.visibility === 'hidden';
}

describe('SPEC SBD-F29-TP1-003: Floating trigger hides when count returns to zero', () => {
  test('syncCount(0) hides the trigger and clears badge text', async () => {
    const harness = await createFloatingDrawerTriggerHarness({ initialCount: 2 });
    const { trigger, badge, api, importError, mountError } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    await api?.syncCount?.(0);

    expect(isHidden(trigger)).toBe(true);
    expect((badge.textContent || '').trim()).toBe('');

    harness.cleanup();
  });
});
