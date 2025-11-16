import { fireEvent, waitFor, within } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';

describe('SPEC F19-TP2-001: Available pagination shell renders summary text and updates after Next', () => {
  test('summary/controls mirror controller state and refresh after goNext runs', async () => {
    const controller = buildPaginationControllerStub([
      {
        summaryText: 'Items 1–10 of 25',
        prevDisabled: true,
        nextDisabled: false,
        isBusy: false,
      },
      {
        summaryText: 'Items 11–20 of 25',
        prevDisabled: false,
        nextDisabled: false,
        isBusy: false,
      },
    ]);

    const harness = await createAdminInventoryHarness({
      paginationControllerFactory: () => controller,
    });

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    expect(pagination).not.toBeNull();

    const summary = pagination.querySelector('#availablePaginationSummary');
    expect(summary).not.toBeNull();
    expect(summary.textContent).toBe('Items 1–10 of 25');

    const { getByRole } = within(pagination);
    const prevButton = getByRole('button', { name: /previous page/i });
    const nextButton = getByRole('button', { name: /next page/i });

    expect(prevButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(false);

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(summary.textContent).toBe('Items 11–20 of 25');
    });
    expect(prevButton.disabled).toBe(false);
    expect(controller.goNext).toHaveBeenCalledTimes(1);
  });
});
