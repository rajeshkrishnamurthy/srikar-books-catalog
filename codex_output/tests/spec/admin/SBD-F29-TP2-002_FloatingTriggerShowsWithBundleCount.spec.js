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

describe('SPEC SBD-F29-TP2-002: Floating trigger shows bundle count when selection is positive', () => {
  test('adding books above zero keeps the trigger fixed in view and caps badge text at two digits', async () => {
    const harness = await createAdminInventoryHarness({ domSource: adminHtml });
    const trigger = document.getElementById('bundleFloatingTrigger');
    const badge = document.getElementById('bundleFloatingBadge');

    expect(trigger).not.toBeNull();
    expect(badge).not.toBeNull();

    const docs = Array.from({ length: 105 }).map((_, index) => ({
      id: `bundle-book-${index + 1}`,
      title: `Bundle Book ${index + 1}`,
      author: 'Spec Author',
      category: 'Fiction',
      binding: 'Paperback',
      price: 199 + index,
      mrp: 299 + index
    }));
    harness.emitAvailableDocs(docs);

    const addButtons = harness.availList.querySelectorAll("[data-action='addToBundle']");
    expect(addButtons.length).toBeGreaterThanOrEqual(105);

    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      expect(trigger?.hidden).toBe(false);
    });

    const position = trigger?.style.position || getComputedStyle(trigger).position;
    expect(position).toBe('fixed');
    expect((badge?.textContent || '').trim()).toBe('1');

    for (let i = 1; i < addButtons.length; i += 1) {
      fireEvent.click(addButtons[i]);
    }

    await waitFor(() => {
      expect((badge?.textContent || '').trim()).toBe('99+');
    });
  });
});
