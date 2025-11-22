const { createFloatingDrawerTriggerHarness } = require('../../fixtures/floatingDrawerTriggerHarness.js');

function isVisible(el) {
  const style = getComputedStyle(el);
  return !el.hidden && style.display !== 'none' && style.visibility !== 'hidden';
}

describe('SPEC SBD-F29-TP1-002: Floating trigger shows when count is positive', () => {
  test('count above zero keeps trigger fixed bottom-right with icon and badge text', async () => {
    const harness = await createFloatingDrawerTriggerHarness({
      initialCount: 3,
      ariaLabel: 'Open bundle drawer'
    });
    const { trigger, badge, icon, importError, mountError } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    expect(isVisible(trigger)).toBe(true);

    const style = getComputedStyle(trigger);
    const position = trigger.style.position || style.position;
    expect(position).toBe('fixed');

    const bottom = trigger.style.bottom || style.bottom;
    const right = trigger.style.right || style.right;
    expect(bottom).not.toBe('auto');
    expect(right).not.toBe('auto');

    const iconEl = trigger.querySelector('.material-icons') || icon;
    expect(iconEl).not.toBeNull();

    expect((badge.textContent || '').trim()).toBe('3');

    harness.cleanup();
  });
});
