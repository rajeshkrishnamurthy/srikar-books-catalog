import { describe, expect, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP3-002: Removing a book chip restores the empty state when the list is depleted', () => {
  test('clicking the remove button for the final chip hides the drawer, shows the empty copy, and returns focus to the trigger', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      {
        id: 'inline-bundle-01',
        title: 'Remove Focus Test',
        author: 'Spec Author',
      },
    ]);

    const trigger = harness.availList.querySelector("[data-test='bookAddToBundle']");
    expect(trigger).not.toBeNull();

    const composer = document.getElementById('inlineBundleComposer');
    const emptyState = document.getElementById('inlineBundleEmptyState');

    fireEvent.click(trigger);

    const removeButton = await waitFor(() => {
      const button = document.querySelector(
        "#inlineBundleSelectedBooks [data-test='inlineBundleRemove']"
      );
      if (!button) {
        throw new Error('waiting for chip remove button');
      }
      return button;
    });

    expect(composer?.hasAttribute('hidden')).toBe(false);
    expect(emptyState?.hasAttribute('hidden')).toBe(true);

    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(
        document.querySelector("#inlineBundleSelectedBooks [data-test='inlineBundleRemove']")
      ).toBeNull();
      expect(emptyState?.hasAttribute('hidden')).toBe(false);
      expect(composer?.hasAttribute('hidden')).toBe(true);
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    });
  });
});
