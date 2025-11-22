import { describe, expect, test, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP3-004: Confirmed Clear bundle wipes selection and collapses the drawer', () => {
  test('accepting the Clear bundle confirmation clears chips, restores empty copy, and returns focus to the last trigger', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      { id: 'inline-bundle-01', title: 'Alpha Bundle' },
      { id: 'inline-bundle-02', title: 'Beta Bundle' },
    ]);

    const triggerButtons = harness.availList.querySelectorAll("[data-test='bookAddToBundle']");
    expect(triggerButtons.length).toBeGreaterThanOrEqual(2);
    const firstTrigger = triggerButtons[0];
    const secondTrigger = triggerButtons[1];
    fireEvent.click(firstTrigger);
    fireEvent.click(secondTrigger);

    const composer = document.getElementById('inlineBundleComposer');
    const emptyState = document.getElementById('inlineBundleEmptyState');
    const resetButton = document.getElementById('inlineBundleReset');
    expect(composer?.hasAttribute('hidden')).toBe(true);
    expect(emptyState?.hasAttribute('hidden')).toBe(true);

    await waitFor(() => {
      const chips = document.querySelectorAll(
        "#inlineBundleSelectedBooks [data-test='inlineBundleRemove']"
      );
      if (chips.length < 2) {
        throw new Error('waiting for chips');
      }
      return chips;
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(
        document.querySelector("#inlineBundleSelectedBooks [data-test='inlineBundleRemove']")
      ).toBeNull();
      expect(emptyState?.hasAttribute('hidden')).toBe(false);
      expect(composer?.hasAttribute('hidden')).toBe(true);
      expect(secondTrigger?.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(secondTrigger);
    });

    confirmSpy.mockRestore();
  });
});
