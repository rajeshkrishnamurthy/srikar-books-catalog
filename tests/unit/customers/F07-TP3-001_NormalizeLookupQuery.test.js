import { normalizeLookupQuery } from '../../../scripts/admin/customerLookup.js';

describe('UNIT F07-TP3 normalizeLookupQuery helper', () => {
  test('trims, collapses whitespace, lowercases, and drops short inputs', () => {
    expect(normalizeLookupQuery('  Anil   Rao ')).toBe('anil rao');
    expect(normalizeLookupQuery('  B ')).toBe('');
    expect(normalizeLookupQuery('')).toBe('');
    expect(normalizeLookupQuery('   ')).toBe('');
  });
});
