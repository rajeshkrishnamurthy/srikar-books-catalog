import {
  normalizeSupplierName,
  isDuplicateSupplierName,
  formatSupplierDisplay,
  buildSupplierPayload,
} from '../../../scripts/admin/suppliers.js';

describe('UNIT F05-TP1 helpers', () => {
  test('normalizeSupplierName trims whitespace and collapses gaps', () => {
    expect(normalizeSupplierName('  Rare   Finds  ')).toBe('Rare Finds');
  });

  test('isDuplicateSupplierName compares case-insensitively', () => {
    const existing = [{ name: 'Acme Books' }];
    expect(isDuplicateSupplierName(existing, 'acme books')).toBe(true);
    expect(isDuplicateSupplierName(existing, 'Nova House')).toBe(false);
  });

  test('formatSupplierDisplay returns readable string', () => {
    expect(
      formatSupplierDisplay({ name: 'Acme Books', location: 'Bengaluru' })
    ).toBe('Acme Books — Bengaluru');
  });

  test('buildSupplierPayload trims inputs and adds timestamps', () => {
    const payload = buildSupplierPayload({
      name: '  Nova House ',
      location: '  Mumbai',
      serverTimestamp: () => 'ts',
    });
    expect(payload.name).toBe('Nova House');
    expect(payload.location).toBe('Mumbai');
    expect(payload.createdAt).toBe('ts');
    expect(payload.updatedAt).toBe('ts');
  });
});
