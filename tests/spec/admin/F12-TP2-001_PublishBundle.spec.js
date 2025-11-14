import { describe, expect, test } from '@jest/globals';
import { createBundleStatusHarness } from '../../fixtures/adminBundleStatusHarness.js';

/**
 * SPEC F12-TP2-001: Publish Draft Bundle
 */

describe('SPEC F12-TP2-001: Publish bundle', () => {
  test('clicking Publish on a Draft bundle updates status to Published', async () => {
    const harness = await createBundleStatusHarness({ status: 'Draft' });

    await harness.publish();

    expect(harness.mocks.updateDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = harness.mocks.updateDoc.mock.calls[0];
    expect(ref.path).toBe('bundles/bundle-1');
    expect(payload).toMatchObject({ status: 'Published' });
    expect(harness.statusChip.textContent).toContain('Published');
    expect(harness.form.dataset.bundleStatus).toBe('Published');
  });
});
