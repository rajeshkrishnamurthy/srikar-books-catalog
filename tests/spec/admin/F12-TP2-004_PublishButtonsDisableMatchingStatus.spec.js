import { describe, expect, test } from '@jest/globals';
import { createBundleStatusHarness } from '../../fixtures/adminBundleStatusHarness.js';

describe('SPEC F12-TP2-004: Publish controls reflect current status', () => {
  test('Toggle reflects current status and shows busy state while updating', async () => {
    const harness = await createBundleStatusHarness({ status: 'Draft' });

    expect(harness.statusToggle.checked).toBe(false);
    expect(harness.statusToggle.disabled).toBe(false);

    let resolveUpdate;
    harness.mocks.updateDoc.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );

    const publishPromise = harness.publish();
    expect(harness.statusToggle.disabled).toBe(true);
    expect(harness.statusChip.classList.contains('is-busy')).toBe(true);

    resolveUpdate();
    await publishPromise;

    expect(harness.statusToggle.checked).toBe(true);
    expect(harness.statusToggle.disabled).toBe(false);
    expect(harness.statusChip.classList.contains('is-busy')).toBe(false);

    harness.mocks.updateDoc.mockResolvedValue();
    await harness.unpublish();
    expect(harness.statusToggle.checked).toBe(false);
  });
});
