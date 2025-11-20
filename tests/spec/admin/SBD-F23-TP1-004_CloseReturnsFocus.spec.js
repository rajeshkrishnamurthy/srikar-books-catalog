import { describe, expect, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP1-004: Closing composer restores focus to trigger', () => {
  test('Close button collapses the drawer and returns focus to the originating Add to bundle button', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      {
        id: 'inline-bundle-focus',
        title: 'Focus Regression Book',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 111,
        mrp: 222,
      },
    ]);

    const composer = document.getElementById('inlineBundleComposer');
    const trigger = harness.availList.querySelector("[data-test='bookAddToBundle']");
    const closeButton = document.getElementById('inlineBundleClose');

    expect(composer).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(closeButton).not.toBeNull();

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(composer?.hasAttribute('hidden')).toBe(false);
    });

    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
