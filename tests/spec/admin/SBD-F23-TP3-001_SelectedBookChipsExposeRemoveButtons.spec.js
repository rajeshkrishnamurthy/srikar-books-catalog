import { describe, expect, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP3-001: Selected book chips expose remove buttons', () => {
  test('adding books renders chips with accessible remove controls that include each title', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      {
        id: 'inline-bundle-01',
        title: 'Drawer Expectations',
        author: 'Spec Author',
      },
      {
        id: 'inline-bundle-02',
        title: 'Panel Reset Behavior',
        author: 'Spec Author',
      },
    ]);

    const triggers = harness.availList.querySelectorAll("[data-test='bookAddToBundle']");
    expect(triggers.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(triggers[0]);
    fireEvent.click(triggers[1]);

    const removeButtons = await waitFor(() => {
      const buttons = document.querySelectorAll(
        "#inlineBundleSelectedBooks [data-test='inlineBundleRemove']"
      );
      if (buttons.length < 2) {
        throw new Error('waiting for chip remove buttons');
      }
      return buttons;
    });

    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]?.getAttribute('aria-label')).toBe(
      'Remove Drawer Expectations from bundle'
    );
    expect(removeButtons[1]?.getAttribute('aria-label')).toBe(
      'Remove Panel Reset Behavior from bundle'
    );
  });
});
