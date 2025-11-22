import { describe, expect, test, jest } from '@jest/globals';
import { createAddBookToastHarness } from '../../helpers/adminAddToastHarness.js';

describe('SPEC SBD-F27-TP1-003: Success toast auto-dismisses', () => {
  test('Success toast schedules auto-dismiss when not pinned and clears from the stack', async () => {
    jest.useFakeTimers();
    const harness = await createAddBookToastHarness();

    const submitPromise = harness.submitAddForm();
    jest.runOnlyPendingTimers(); // flush FormData/submit promise queue
    await submitPromise;

    const stack = harness.toastStack;
    expect(stack.children.length).toBeGreaterThan(0);

    const firstToast = stack.firstElementChild;
    const firstId = firstToast?.dataset?.toastId;

    jest.runOnlyPendingTimers();

    const remaining = firstId
      ? stack.querySelector(`[data-toast-id="${firstId}"]`)
      : stack.firstElementChild;

    expect(remaining).toBeNull();
    expect(stack.children.length).toBe(0);

    jest.useRealTimers();
    harness.cleanup?.();
  });
});
