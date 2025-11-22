import { describe, expect, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminInventoryHarness } from '../../../../tests/fixtures/adminInventoryHarness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');
const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');

describe('SPEC SBD-F29-TP2-003: Floating trigger hides when selection is cleared', () => {
  test('resetting the inline bundle composer returns the floating trigger to a hidden, empty state', async () => {
    const harness = await createAdminInventoryHarness({ domSource: adminHtml });
    const trigger = document.getElementById('bundleFloatingTrigger');
    const badge = document.getElementById('bundleFloatingBadge');

    expect(trigger).not.toBeNull();
    expect(badge).not.toBeNull();

    harness.emitAvailableDocs([
      {
        id: 'bundle-reset-1',
        title: 'Reset Bundle One',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 199,
        mrp: 299
      },
      {
        id: 'bundle-reset-2',
        title: 'Reset Bundle Two',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 299,
        mrp: 399
      }
    ]);

    const addButtons = harness.availList.querySelectorAll("[data-action='addToBundle']");
    expect(addButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(trigger?.hidden).toBe(false);
      expect((badge?.textContent || '').trim()).toBe('1');
    });

    const resetButton = document.getElementById('inlineBundleReset');
    expect(resetButton).not.toBeNull();

    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(trigger?.hidden).toBe(true);
      expect((badge?.textContent || '').trim()).toBe('');
    });
  });
});
