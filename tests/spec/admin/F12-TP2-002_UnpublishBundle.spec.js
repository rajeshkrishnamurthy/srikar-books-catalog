import { describe, expect, test } from '@jest/globals';
import { createBundleStatusHarness } from '../../fixtures/adminBundleStatusHarness.js';

/**
 * SPEC F12-TP2-002: Unpublish bundle
 */

describe('SPEC F12-TP2-002: Unpublish bundle', () => {
  test('clicking Unpublish flips status back to Draft/Hidden', async () => {
    const harness = await createBundleStatusHarness({ status: 'Published' });

    await harness.unpublish();

    expect(harness.mocks.updateDoc).toHaveBeenCalledTimes(1);
    const [, payload] = harness.mocks.updateDoc.mock.calls[0];
    expect(payload).toMatchObject({ status: 'Draft' });
    expect(harness.form.dataset.bundleStatus).toBe('Draft');
    expect(harness.statusChip.textContent).toContain('Draft');
  });
});
