# Code Review — F09-TP8 Selling Price Input Guardrails

**Strengths**  
- `scripts/admin/salesLineItems.js:60-110` now sanitizes the selling-price field on every `input` event via `sanitizeSellingPriceInput`, stripping alphabetic characters immediately so the DOM never drifts from numeric state.  
- `handleAddLine` rejects negative entries by reusing `sanitizeSellingPriceInput` + `isNegativePrice`, surfaces the positive-number guidance, and blocks line creation while the Add button remains disabled through `updateAddButtonState`.  
- Harness + specs (`tests/spec/admin/F09-TP8-001/002`) assert both the key filtering and validation paths, so regressions will surface quickly.

**Findings**  
- None.

**Verdict:** READY FOR MERGE
