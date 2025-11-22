import { describe, expect, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC SBD-F23-TP1-003: Add to bundle trigger seeds inline composer state', () => {
  test('first selection stores the chip, keeps the drawer hidden, and flags the trigger as active', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      {
        id: 'inline-bundle-01',
        title: 'Drawer Expectations',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 450,
        mrp: 600,
      },
    ]);

    const composer = document.getElementById('inlineBundleComposer');
    const heading = document.getElementById('inlineBundleHeading');
    const selectionList = document.getElementById('inlineBundleSelectedBooks');
    const emptyState = document.getElementById('inlineBundleEmptyState');
    const trigger = harness.availList.querySelector("[data-test='bookAddToBundle']");

    expect(composer).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(selectionList).not.toBeNull();
    expect(emptyState).not.toBeNull();
    expect(trigger).not.toBeNull();

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(composer?.hasAttribute('hidden')).toBe(true);
      expect(trigger?.getAttribute('aria-pressed')).toBe('true');
      expect(selectionList?.textContent || '').toContain('Drawer Expectations');
      expect(emptyState?.hasAttribute('hidden')).toBe(true);
    });
  });
});
