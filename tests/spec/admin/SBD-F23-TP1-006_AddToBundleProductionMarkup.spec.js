import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

const adminHtmlPath = new URL('../../../admin.html', import.meta.url);
const adminMarkup = readFileSync(adminHtmlPath, 'utf-8');

describe('SPEC SBD-F23-TP1-006: Inline composer opens from production markup', () => {
  test('clicking Add to bundle inside the real admin markup opens the drawer and renders chip', async () => {
    const harness = await createAdminInventoryHarness({
      domSource: adminMarkup,
    });

    harness.emitAvailableDocs([
      {
        id: 'prod-inline-001',
        title: 'Production Inline Bundle',
        author: 'Spec Author',
        category: 'Fiction',
        binding: 'Paperback',
        price: 350,
      },
    ]);

    const composer = document.getElementById('inlineBundleComposer');
    const heading = document.getElementById('inlineBundleHeading');
    const selectionList = document.getElementById('inlineBundleSelectedBooks');
    const emptyState = document.getElementById('inlineBundleEmptyState');

    expect(composer).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(selectionList).not.toBeNull();
    expect(emptyState).not.toBeNull();

    const trigger = await waitFor(() =>
      document.querySelector("[data-test='bookAddToBundle']")
    );
    expect(trigger).not.toBeNull();

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(composer?.hasAttribute('hidden')).toBe(false);
      expect(emptyState?.hasAttribute('hidden')).toBe(true);
      expect(selectionList?.textContent || '').toContain('Production Inline Bundle');
      expect(document.activeElement).toBe(heading);
    });
  });
});
