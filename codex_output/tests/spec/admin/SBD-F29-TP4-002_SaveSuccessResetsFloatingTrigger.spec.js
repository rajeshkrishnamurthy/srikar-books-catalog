import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminInventoryHarness } from '../../../../tests/fixtures/adminInventoryHarness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');
const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');

async function setupBundleReadyForSave(addDoc) {
  const harness = await createAdminInventoryHarness({
    domSource: adminHtml,
    firebaseOverrides: { addDoc },
  });

  harness.emitAvailableDocs([
    {
      id: 'bundle-reset-1',
      title: 'Resettable Book',
      author: 'Spec Author',
      category: 'Fiction',
      binding: 'Paperback',
      price: 199,
      mrp: 299,
    },
  ]);

  const addButton = document.querySelector("[data-action='addToBundle']");
  expect(addButton).not.toBeNull();
  fireEvent.click(addButton);

  const trigger = document.getElementById('bundleFloatingTrigger');
  const badge = document.getElementById('bundleFloatingBadge');
  await waitFor(() => {
    const chips = document.querySelectorAll(
      "#inlineBundleSelectedBooks [data-test='inlineBundleRemove']"
    );
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });
  await waitFor(() => expect(trigger?.hidden).toBe(false));
  expect((badge?.textContent || '').trim()).toBe('1');

  fireEvent.click(trigger);

  const nameInput = document.getElementById('inlineBundleName');
  const priceInput = document.getElementById('inlineBundlePrice');
  const saveButton = document.getElementById('inlineBundleSave');
  expect(nameInput).not.toBeNull();
  expect(priceInput).not.toBeNull();
  expect(saveButton).not.toBeNull();

  fireEvent.input(nameInput, { target: { value: 'Reset Bundle' } });
  fireEvent.input(priceInput, { target: { value: '199' } });

  await waitFor(() => expect(saveButton?.disabled).toBe(false));

  return {
    harness,
    trigger,
    badge,
    saveButton,
    addButton,
    nameInput,
    priceInput,
  };
}

describe('SPEC SBD-F29-TP4-002: Save success resets inline bundle and floating trigger', () => {
  test('resolving saveInlineBundle clears selection, empties the badge, and hides the trigger', async () => {
    const addDoc = jest.fn().mockResolvedValue({ id: 'bundle-reset-id' });
    const { trigger, badge, saveButton, addButton, nameInput, priceInput } =
      await setupBundleReadyForSave(addDoc);

    fireEvent.click(saveButton);

    await waitFor(() => expect(addDoc).toHaveBeenCalled());

    await waitFor(() => {
      const chips = document.querySelectorAll(
        "#inlineBundleSelectedBooks [data-test='inlineBundleRemove']"
      );
      expect(chips.length).toBe(0);
      expect(trigger?.hidden).toBe(true);
      expect((badge?.textContent || '').trim()).toBe('');
    });

    const emptyState = document.getElementById('inlineBundleEmptyState');
    expect(emptyState?.hasAttribute('hidden')).toBe(false);
    expect(nameInput?.value).toBe('');
    expect(priceInput?.value).toBe('');
    expect(addButton?.getAttribute('aria-pressed')).toBe('false');
  });
});
