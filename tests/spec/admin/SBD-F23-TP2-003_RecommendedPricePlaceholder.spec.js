import { describe, expect, test } from '@jest/globals';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP2-003: Recommended and total price placeholders', () => {
  test('composer seeds recommended and total price blocks with placeholder copy before controller data arrives', async () => {
    await createAdminInventoryHarness();

    const recommended = document.getElementById('inlineBundleRecommended');
    const total = document.getElementById('inlineBundleTotal');

    expect(recommended).not.toBeNull();
    expect(total).not.toBeNull();

    const placeholder = '\u2014'; // em dash placeholder per admin markup
    expect(recommended?.textContent?.trim()).toBe(placeholder);
    expect(total?.textContent?.trim()).toBe(placeholder);
  });
});
