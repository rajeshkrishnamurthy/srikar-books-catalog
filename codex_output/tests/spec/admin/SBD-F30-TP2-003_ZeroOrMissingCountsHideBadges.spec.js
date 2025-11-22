const {
  createAvailableBooksMembershipCountsHarness,
  flushCounts
} = require('../../fixtures/availableBooksMembershipCountsHarness.js');

describe('SPEC SBD-F30-TP2-003: Missing or zero bundle counts keep badges hidden', () => {
  test('pagechange treats missing or zero counts as hidden badges for that page', async () => {
    const harness = await createAvailableBooksMembershipCountsHarness({
      countsById: { 'book-1': 0 }
    });
    const {
      adapters,
      badgesById,
      dispatchPageChange,
      importError,
      mountError,
      cleanup
    } = harness;

    expect(importError).toBeUndefined();
    expect(mountError).toBeUndefined();

    dispatchPageChange(['book-1', 'book-2']);
    await flushCounts();

    expect(adapters.getBundleMembershipCounts).toHaveBeenCalledWith({
      bookIds: ['book-1', 'book-2']
    });

    expect(badgesById['book-1'].hidden).toBe(true);
    expect(badgesById['book-1'].textContent).toBe('');
    expect(badgesById['book-2'].hidden).toBe(true);
    expect(badgesById['book-2'].textContent).toBe('');

    cleanup();
  });
});
