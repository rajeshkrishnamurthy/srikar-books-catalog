import { fireEvent, waitFor } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';

describe('SPEC F10-TP1-001: Header search filters Available list in place', () => {
  test('typing a qualifying query in the header re-renders availList with only matches', async () => {
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
      {
        id: 'history',
        title: 'World History Digest',
        author: 'N. Scholar',
        category: 'History',
        binding: 'Paperback',
      },
    ]);

    expect(harness.availList.querySelectorAll('.row')).toHaveLength(3);

    harness.availableSearchInput.value = 'astro';
    fireEvent.input(harness.availableSearchInput);

    await waitFor(() => {
      expect(harness.availList.querySelectorAll('.row')).toHaveLength(1);
    });
    expect(harness.availList.textContent).toContain('Astrophysics 101');
  });
});
