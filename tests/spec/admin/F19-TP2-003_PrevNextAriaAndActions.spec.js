import { fireEvent, waitFor, within } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';

describe('SPEC F19-TP2-003: Prev/Next wire to controller and expose aria hooks', () => {
  test('buttons point to availList, use aria-live summary, and trigger goPrev once enabled', async () => {
    const controller = buildPaginationControllerStub([
      {
        summaryText: 'Items 11–20 of 25',
        prevDisabled: false,
        nextDisabled: true,
        isBusy: false,
      },
      {
        summaryText: 'Items 1–10 of 25',
        prevDisabled: true,
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
    expect(summary.getAttribute('aria-live')).toBe('polite');
    expect(summary.textContent).toBe('Items 11–20 of 25 available books');

    const { getByRole } = within(pagination);
    const prevButton = getByRole('button', { name: /previous page/i });
    const nextButton = getByRole('button', { name: /next page/i });

    expect(prevButton.getAttribute('aria-controls')).toBe('availList');
    expect(nextButton.getAttribute('aria-controls')).toBe('availList');

    expect(prevButton.disabled).toBe(false);
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(summary.textContent).toBe('Items 1–10 of 25 available books');
    });

    expect(controller.goPrev).toHaveBeenCalledTimes(1);
    expect(controller.goNext).not.toHaveBeenCalled();
  });
});
