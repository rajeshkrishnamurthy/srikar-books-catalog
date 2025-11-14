import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC F10-TP1-003: Announce filtered results from the Available header search', () => {
  test('qualifying query announces the filtered count inside the panel', async () => {
    const harness = await createAdminInventoryHarness();
    harness.emitAvailableDocs([
      {
        id: 'astro',
        title: 'Astrophysics 101',
        author: 'Neil D.',
        category: 'Science',
        binding: 'Paperback',
      },
      {
        id: 'poetry',
        title: 'Poems of the Sun',
        author: 'A. Ray',
        category: 'Poetry',
        binding: 'Hardcover',
      },
    ]);

    expect(harness.availablePanel.contains(harness.searchStatus)).toBe(true);

    harness.availableSearchInput.value = 'astro';
    fireEvent.input(harness.availableSearchInput);

    await waitFor(() => {
      expect(harness.searchStatus.textContent.trim()).toBe(
        "Filtered 1 results for 'astro'"
      );
    });
  });
});
