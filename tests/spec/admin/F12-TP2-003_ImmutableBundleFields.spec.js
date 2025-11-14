import { describe, expect, test } from '@jest/globals';
import { createBundleStatusHarness } from '../../fixtures/adminBundleStatusHarness.js';

/**
 * SPEC F12-TP2-003: Immutable fields after creation
 */

describe('SPEC F12-TP2-003: Immutable bundle fields', () => {
  test('attempting to edit title/price after creation is blocked with inline message', async () => {
    const harness = await createBundleStatusHarness({ status: 'Published' });

    harness.setField('title', 'New Title');
    harness.setField('price', '999');
    await harness.submit();

    expect(harness.mocks.updateDoc).not.toHaveBeenCalled();
    expect(harness.msgEl.textContent.toLowerCase()).toContain('immutable');
  });
});
