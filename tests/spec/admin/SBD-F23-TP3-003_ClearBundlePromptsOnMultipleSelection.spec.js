import { describe, expect, test, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP3-003: Clear bundle prompts when multiple selections exist', () => {
  test('clicking Clear bundle with 2+ selections confirms before wiping chips', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      { id: 'inline-bundle-01', title: 'Alpha Bundle' },
      { id: 'inline-bundle-02', title: 'Beta Bundle' },
    ]);

    const triggerButtons = harness.availList.querySelectorAll("[data-test='bookAddToBundle']");
    expect(triggerButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(triggerButtons[0]);
    fireEvent.click(triggerButtons[1]);

    await waitFor(() => {
      const chips = document.querySelectorAll(
        "#inlineBundleSelectedBooks [data-test='inlineBundleRemove']"
      );
      if (chips.length < 2) {
        throw new Error('waiting for chips');
      }
      return chips;
    });

    const resetButton = document.getElementById('inlineBundleReset');
    expect(resetButton).not.toBeNull();

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    fireEvent.click(resetButton);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toContain('Clear bundle');
    expect(confirmSpy.mock.calls[0][0]).toContain('2');

    const remainingChips = document.querySelectorAll(
      "#inlineBundleSelectedBooks [data-test='inlineBundleRemove']"
    );
    expect(remainingChips).toHaveLength(2);

    confirmSpy.mockRestore();
  });
});
