import { fireEvent, waitFor, within } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

function buildDocs(count = 30) {
  return Array.from({ length: count }, (_, idx) => ({
    id: `book-${idx + 1}`,
    title: `Book ${idx + 1}`,
    author: 'Author',
    category: 'Category',
    binding: 'Paperback',
  }));
}

describe('SPEC F19-TP4-001: Page size selector renders and defaults to 20', () => {
  test('selector shows 10/20/50 options with 20 selected and aria labels intact', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs(buildDocs(30));

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    expect(pagination).not.toBeNull();

    const sizeSelect = pagination.querySelector('#availablePageSize');
    expect(sizeSelect).not.toBeNull();
    expect(sizeSelect.value).toBe('20');

    const options = Array.from(sizeSelect.options).map((opt) => opt.value);
    expect(options).toEqual(['10', '20', '50']);

    const label = pagination.querySelector('label[for="availablePageSize"]');
    expect(label).not.toBeNull();
    expect(label.textContent).toMatch(/Items per page/i);

    await waitFor(() => {
      const rows = harness.availList.querySelectorAll('.row');
      expect(rows.length).toBe(20);
    });
  });
});
