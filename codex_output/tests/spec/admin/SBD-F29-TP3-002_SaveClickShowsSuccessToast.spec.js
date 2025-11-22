import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createToastTestHarness } from '../../helpers/toastTestHarness.js';
import { createAdminInventoryHarness } from '../../../../tests/fixtures/adminInventoryHarness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../../admin.html');
const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');

async function setupInlineBundleSave({ addDoc, toastHarness } = {}) {
  const toast = toastHarness || createToastTestHarness();
  const harness = await createAdminInventoryHarness({
    domSource: adminHtml,
    firebaseOverrides: { addDoc },
  });

  harness.emitAvailableDocs([
    {
      id: 'toast-book-1',
      title: 'Toast Bundle Book',
      price: 199,
      mrp: 299,
    },
  ]);

  const addButton = document.querySelector("[data-action='addToBundle']");
  expect(addButton).not.toBeNull();
  fireEvent.click(addButton);

  const floatingTrigger = document.getElementById('bundleFloatingTrigger');
  if (floatingTrigger) {
    await waitFor(() => expect(floatingTrigger?.hidden).toBe(false));
    fireEvent.click(floatingTrigger);
  }

  const nameInput = document.getElementById('inlineBundleName');
  const priceInput = document.getElementById('inlineBundlePrice');
  expect(nameInput).not.toBeNull();
  expect(priceInput).not.toBeNull();

  fireEvent.input(nameInput, { target: { value: 'Toast Bundle' } });
  fireEvent.input(priceInput, { target: { value: '199' } });

  const saveButton = document.getElementById('inlineBundleSave');
  await waitFor(() => expect(saveButton?.disabled).toBe(false));

  return { toast, harness, saveButton };
}

describe('SPEC SBD-F29-TP3-002: Inline save click dispatches success toast', () => {
  test('clicking Save invokes saveInlineBundle and showToast with the bundle name', async () => {
    const toast = createToastTestHarness();
    const addDoc = jest.fn().mockResolvedValue({ id: 'bundle-toast-id' });
    const { saveButton } = await setupInlineBundleSave({ addDoc, toastHarness: toast });

    try {
      fireEvent.click(saveButton);

      await waitFor(() => expect(addDoc).toHaveBeenCalled());
      await waitFor(() => expect(toast.showToast).toHaveBeenCalled());

      const payload = toast.showToast.mock.calls.at(-1)?.[0] || {};
      const message = (payload.message || '').toLowerCase();
      expect(message).toContain('toast bundle');
      expect(payload.variant || 'success').toBe('success');

      const liveText = (toast.toastLiveRegion.textContent || '').toLowerCase();
      expect(liveText).toContain('toast bundle');
      expect(toast.toastStack.children.length).toBeGreaterThan(0);
    } finally {
      toast.cleanup();
      document.body.innerHTML = '';
    }
  });
});
