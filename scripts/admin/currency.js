// scripts/admin/currency.js
// Shared helpers for parsing integer/decimal currency-like form inputs so
// add/edit flows stay in sync on validation rules.

export function parseCurrencyValue(rawInput, options = {}) {
  const { allowDecimal = false } = options;
  const raw = (rawInput ?? '').toString().trim();
  if (!raw) {
    return { hasValue: false, raw, value: null, isNumeric: true };
  }

  const pattern = allowDecimal ? /^-?\d+(\.\d+)?$/ : /^-?\d+$/;
  if (!pattern.test(raw)) {
    return { hasValue: true, raw, value: null, isNumeric: false };
  }

  const parsed = allowDecimal
    ? Number.parseFloat(raw)
    : Number.parseInt(raw, 10);
  const isNumeric = Number.isFinite(parsed);
  return {
    hasValue: true,
    raw,
    value: isNumeric ? parsed : null,
    isNumeric,
  };
}

export function readCurrencyField(fd, name, options = {}) {
  const raw = typeof fd?.get === 'function' ? fd.get(name) : undefined;
  return parseCurrencyValue(raw, options);
}
