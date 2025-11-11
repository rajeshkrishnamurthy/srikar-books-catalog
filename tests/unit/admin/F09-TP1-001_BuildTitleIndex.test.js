import { buildTitleIndex } from '../../../scripts/admin/salesTitleAutocomplete.js';

describe('UNIT F09-TP1-001: buildTitleIndex helper', () => {
  test('dedupes catalog entries and returns normalized tokens for substring matching', () => {
    const docs = [
      { id: 'book-1', title: 'Design Systems', supplier: { id: 'sup-2' }, status: 'available' },
      { id: 'book-1', title: 'Design Systems', supplier: { id: 'sup-2' }, status: 'available' }, // duplicate
      { id: 'book-2', title: 'Grid Systems', supplier: { id: 'sup-9' }, status: 'sold' },
    ];

    const index = buildTitleIndex(docs);

    expect(index).toHaveLength(2);
    const designEntry = index.find((entry) => entry.id === 'book-1');
    expect(designEntry).toMatchObject({
      id: 'book-1',
      title: 'Design Systems',
      titleLower: 'design systems',
      tokens: expect.arrayContaining(['design', 'systems']),
    });
    const gridEntry = index.find((entry) => entry.id === 'book-2');
    expect(gridEntry.tokens).toContain('grid');
  });
});
