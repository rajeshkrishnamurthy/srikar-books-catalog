import { fireEvent } from '@testing-library/dom';
import { jest } from '@jest/globals';
import { initSaleTitleAutocomplete } from '../../../scripts/admin/salesTitleAutocomplete.js';
import { createSalesLineItemsHarness } from '../../fixtures/salesLineItemsHarness.js';

function buildHeaderStateReady() {
  const listeners = new Set();
  const api = {
    isReady: () => true,
    onReadyChange(cb = () => {}) {
      listeners.add(cb);
      cb(true);
      return () => listeners.delete(cb);
    },
  };
  return api;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('SPEC F09-TP4-005: Wiring — no-match clears selection and disables draft', () => {
  test('after a valid selection, a subsequent no-match query clears the hidden bookId and re-disables the draft', async () => {
    const headerState = buildHeaderStateReady();
    const harness = await createSalesLineItemsHarness({ headerState });
    harness.selectBook({
      id: 'book-1',
      title: 'Design Systems',
      supplier: { id: 'sup-1', name: 'Rare Reads' },
    });
    harness.typePrice('450');
    expect(harness.bookIdInput.value).toBe('book-1');
    expect(harness.addLineBtn.disabled).toBe(false);

    const loadBooks = jest.fn(async () => []);

    initSaleTitleAutocomplete(
      {
        input: harness.bookTitleInput,
        list: harness.suggestionsList,
        hiddenInput: harness.bookIdInput,
        summaryEl: harness.selectedBookSummary,
        msgEl: harness.msgEl,
      },
      { loadBooks }
    );

    harness.bookTitleInput.value = 'Unknown title';
    fireEvent.input(harness.bookTitleInput);
    await flushPromises();

    expect(loadBooks).toHaveBeenCalledTimes(1);
    expect(harness.msgEl.textContent).toMatch(/no catalog match/i);
    expect(harness.bookIdInput.value).toBe('');
    expect(harness.selectedBookSummary.dataset.empty).toBe('true');
    expect(harness.addLineBtn.disabled).toBe(true);
  });
});
