import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC F10-TP1-002: Ignore short header search queries', () => {
  test('dropping below two characters restores the full list without announcements', async () => {
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

    harness.availableSearchInput.value = 'sun';
    fireEvent.input(harness.availableSearchInput);

    await waitFor(() => {
      expect(harness.availList.querySelectorAll('.row')).toHaveLength(1);
    });

    harness.availableSearchInput.value = 's';
    fireEvent.input(harness.availableSearchInput);

    await waitFor(() => {
      expect(harness.availList.querySelectorAll('.row')).toHaveLength(2);
    });
    expect(harness.searchStatus.textContent.trim()).toBe('');
  });
});
