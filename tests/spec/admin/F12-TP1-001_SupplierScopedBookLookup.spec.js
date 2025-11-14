import { createBundleHarness } from '../../fixtures/adminBundleHarness.js';

const supplierOptions = [
  { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' },
  { id: 'sup-2', name: 'Paper Trail', location: 'Hyderabad' },
];

const sampleBook = (overrides = {}) => ({
  id: 'book-1',
  title: 'Book One',
  price: 250,
  supplier: { id: 'sup-1', name: 'Lotus Books', location: 'Chennai' },
  ...overrides,
});

describe('SPEC F12-TP1-001: Supplier-scoped lookup and reset', () => {
  test('supplier lock + reset flow scopes lookup to a single supplier at a time', async () => {
    const harness = await createBundleHarness();
    harness.setSupplierOptions(supplierOptions);

    expect(harness.lookupMock).not.toHaveBeenCalled();

    harness.setSupplier('sup-1');

    expect(harness.lookupMock).toHaveBeenCalledTimes(1);
    const [config] = harness.lookupMock.mock.calls[0];
    expect(config.supplierId).toBe('sup-1');
    expect(typeof config.onSelect).toBe('function');
    expect(harness.isSupplierLocked()).toBe(true);

    harness.emitBookSelection(sampleBook());
    expect(harness.selectedBookIds()).toEqual(['book-1']);

    expect(() => harness.setSupplier('sup-2')).toThrow(/locked/i);
    expect(harness.lookupMock).toHaveBeenCalledTimes(1);

    harness.clickReset();
    expect(harness.isSupplierLocked()).toBe(false);
    expect(harness.selectedBookIds()).toEqual([]);

    harness.setSupplier('sup-2');
    expect(harness.lookupMock).toHaveBeenCalledTimes(2);
    const [configAfterReset] = harness.lookupMock.mock.calls[1];
    expect(configAfterReset.supplierId).toBe('sup-2');
    expect(harness.submitDisabled()).toBe(true);
  });
});
