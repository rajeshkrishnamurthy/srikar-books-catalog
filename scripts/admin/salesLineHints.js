const DEFAULT_SUPPLIER_HINT = 'Supplier: Not set';
const DEFAULT_PURCHASE_HINT = 'Purchase price: Not set';
const DEFAULT_SELLING_HINT = 'Last sold price: Not set';

export function formatPriceHint(options = {}) {
  const {
    label = 'Price',
    amount,
    currency = '₹',
    formatter,
    fallback = 'Not set',
  } = options;
  const numeric = Number(amount);
  if (amount == null || Number.isNaN(numeric)) {
    return `${label}: ${fallback}`;
  }
  const formatted =
    typeof formatter === 'function' ? formatter(numeric) : `${currency}${numeric}`;
  return `${label}: ${formatted}`;
}

export function renderSaleLineHints(elements = {}, options = {}) {
  const { supplierHintEl, purchaseHintEl, sellingHintEl } = elements;
  const defaults = options.defaults || {};
  const supplierDefaults = defaults.supplier || DEFAULT_SUPPLIER_HINT;
  const purchaseDefaults = defaults.purchase || DEFAULT_PURCHASE_HINT;
  const sellingDefaults = defaults.selling || DEFAULT_SELLING_HINT;
  updateSupplierHint(supplierHintEl, options.supplier, supplierDefaults);
  updatePriceHint(purchaseHintEl, {
    label: 'Purchase price',
    amount: options.history?.purchasePrice,
    formatter: options.formatCurrency,
    fallback: purchaseDefaults.replace(/^Purchase price:\s*/i, 'Not set'),
    defaultText: purchaseDefaults,
    currency: options.history?.currency,
  });
  updatePriceHint(sellingHintEl, {
    label: 'Last sold price',
    amount: options.history?.lastSellingPrice,
    formatter: options.formatCurrency,
    fallback: sellingDefaults.replace(/^Last sold price:\s*/i, 'Not set'),
    defaultText: sellingDefaults,
    currency: options.history?.currency,
  });
}

function updateSupplierHint(element, supplier, fallback) {
  if (!element) return;
  if (supplier?.name) {
    const location = supplier.location ? ` — ${supplier.location}` : '';
    element.textContent = `Supplier: ${supplier.name}${location}`;
    element.dataset.empty = 'false';
    return;
  }
  element.textContent = fallback || DEFAULT_SUPPLIER_HINT;
  element.dataset.empty = 'true';
}

function updatePriceHint(element, options) {
  if (!element) return;
  const { amount, label, formatter, fallback, defaultText, currency } = options;
  if (amount == null || Number.isNaN(Number(amount))) {
    element.textContent = defaultText || `${label}: ${fallback || 'Not set'}`;
    element.dataset.empty = 'true';
    return;
  }
  element.textContent = formatPriceHint({
    label,
    amount,
    formatter,
    currency,
    fallback,
  });
  element.dataset.empty = 'false';
}
