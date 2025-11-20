import { describe, expect, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP1-005: Closing drawer preserves selected books', () => {
  test('Clicking the close button hides the drawer without clearing selected book chips', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      {
        id: 'inline-bundle-close',
        title: 'Keep Bundle Selection',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 333,
        mrp: 444,
      },
    ]);

    const composer = document.getElementById('inlineBundleComposer');
    const trigger = harness.availList.querySelector("[data-test='bookAddToBundle']");
    const closeButton = document.getElementById('inlineBundleClose');
    const selectionList = document.getElementById('inlineBundleSelectedBooks');

    expect(composer).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(closeButton).not.toBeNull();
    expect(selectionList).not.toBeNull();

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(selectionList?.textContent || '').toContain('Keep Bundle Selection');
    });

    fireEvent.click(closeButton);

    expect(composer?.hasAttribute('hidden')).toBe(true);
    expect(selectionList?.textContent || '').toContain('Keep Bundle Selection');
  });
});
