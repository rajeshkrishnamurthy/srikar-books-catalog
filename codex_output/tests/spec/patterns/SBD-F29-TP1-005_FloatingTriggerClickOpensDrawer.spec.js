const { createFloatingDrawerTriggerHarness } = require('../../fixtures/floatingDrawerTriggerHarness.js');

function isVisible(el) {
  const style = getComputedStyle(el);
  return !el.hidden && style.display !== 'none' && style.visibility !== 'hidden';
}

describe('SPEC SBD-F29-TP1-005: Floating trigger click opens drawer with animation hook', () => {
  test('clicking the trigger calls openDrawer, applyAnimation, and toggles animation class', async () => {
    const harness = await createFloatingDrawerTriggerHarness({
      initialCount: 4,
      animationClass: 'drawer-opening'
    });
    const { trigger, adapters, importError, mountError } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();
    expect(isVisible(trigger)).toBe(true);

    trigger.click();

    expect(adapters.openDrawer).toHaveBeenCalled();
    expect(adapters.applyAnimation).toHaveBeenCalled();

    const animationArg = adapters.applyAnimation.mock.calls.at(-1)?.[0];
    if (animationArg !== undefined) {
      const isOpenState =
        (typeof animationArg === 'string' && /open/i.test(animationArg)) ||
        (typeof animationArg === 'object' && animationArg?.isOpening === true);
      expect(isOpenState).toBe(true);
    }

    expect(trigger.classList.contains('drawer-opening')).toBe(true);

    harness.cleanup();
  });
});
