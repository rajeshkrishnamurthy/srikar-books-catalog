import { purchaseMessage } from '../../../scripts/lib/wa.js';

describe('SPEC TP4-003: WhatsApp message hides purchase price', () => {
  test('purchaseMessage ignores purchasePrice field entirely', () => {
    const msg = purchaseMessage({
      title: 'Invisible Cost Book',
      author: 'Secret Author',
      purchasePrice: 1234,
    });

    expect(msg).not.toMatch(/purchase price/i);
    expect(msg).not.toContain('1234');
    expect(msg).toMatch(/Invisible Cost Book/);
    expect(msg).toMatch(/Secret Author/);
  });
});
