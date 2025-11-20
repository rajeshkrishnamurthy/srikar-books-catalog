import { fireEvent, within } from '@testing-library/dom';
import { createAdminInventoryHarness } from '../../fixtures/adminInventoryHarness.js';
import { buildPaginationControllerStub } from '../../fixtures/paginationControllerStub.js';

describe('SPEC F19-TP2-002: Busy pagination shell disables controls and blocks duplicate clicks', () => {
  test('when controller reports isBusy, both buttons stay disabled and ignore clicks', async () => {
    const controller = buildPaginationControllerStub([
      {
        summaryText: 'Items 11–20 of 40',
        prevDisabled: true,
        nextDisabled: true,
        isBusy: true,
      },
    ]);

    const harness = await createAdminInventoryHarness({
      paginationControllerFactory: () => controller,
    });

    const pagination = harness.availablePanel.querySelector(
      '[data-available-pagination]'
    );
    expect(pagination).not.toBeNull();
    expect(pagination.getAttribute('aria-busy')).toBe('true');

    const { getByRole } = within(pagination);
    const prevButton = getByRole('button', { name: /previous page/i });
    const nextButton = getByRole('button', { name: /next page/i });

    expect(prevButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(true);

    fireEvent.click(prevButton);
    fireEvent.click(nextButton);

    expect(controller.goPrev).not.toHaveBeenCalled();
    expect(controller.goNext).not.toHaveBeenCalled();
  });
});
