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

describe('SPEC SBD-F29-TP2-004: Floating trigger click opens inline bundle drawer', () => {
  test('clicking #bundleFloatingTrigger fires openInlineBundleDrawer and applies the animation class to the composer', async () => {
    const animationClass = 'bundle-drawer-opening';
    globalThis.openInlineBundleDrawer = jest.fn();

    const harness = await createAdminInventoryHarness({ domSource: adminHtml });
    const trigger = document.getElementById('bundleFloatingTrigger');
    const badge = document.getElementById('bundleFloatingBadge');
    const composer = document.getElementById('inlineBundleComposer');
    const closeButton = document.getElementById('inlineBundleClose');

    expect(trigger).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(composer).not.toBeNull();
    expect(closeButton).not.toBeNull();

    harness.emitAvailableDocs([
      {
        id: 'bundle-open-1',
        title: 'Drawer Opener',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 199,
        mrp: 299
      }
    ]);

    const addButton = harness.availList.querySelector("[data-action='addToBundle']");
    expect(addButton).not.toBeNull();

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(trigger?.hidden).toBe(false);
      expect((badge?.textContent || '').trim()).toBe('1');
      expect(composer?.hasAttribute('hidden')).toBe(false);
    });

    composer?.classList.remove(animationClass);
    fireEvent.click(closeButton);
    expect(composer?.hidden).toBe(true);

    trigger?.click();

    await waitFor(() => {
      expect(globalThis.openInlineBundleDrawer).toHaveBeenCalled();
      expect(composer?.hidden).toBe(false);
      expect(composer?.classList.contains(animationClass)).toBe(true);
    });

    delete globalThis.openInlineBundleDrawer;
  });
});
