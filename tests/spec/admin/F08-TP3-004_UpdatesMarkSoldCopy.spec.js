import { updateMarkSoldButtonCopy } from '../../../scripts/admin/salesPersist.js';

describe('SPEC F08-TP3-004: Update legacy “Mark sold” button text', () => {
  test('renames every Mark sold button to Out of stock while preserving actions', () => {
    document.body.innerHTML = `
      <div id="availList">
        <button data-action="sold" class="btn">Mark sold</button>
        <button data-action="available" class="btn">Mark available</button>
      </div>
      <div id="soldList">
        <button data-action="sold" class="btn">Mark sold</button>
      </div>
    `;

    updateMarkSoldButtonCopy(document);

    const soldButtons = document.querySelectorAll('button[data-action="sold"]');
    expect(soldButtons).toHaveLength(2);
    soldButtons.forEach((btn) => {
      expect(btn.textContent).toBe('Out of stock');
      expect(btn.dataset.action).toBe('sold');
    });
    expect(document.querySelector('button[data-action="available"]').textContent).toBe('Mark available');
  });
});
