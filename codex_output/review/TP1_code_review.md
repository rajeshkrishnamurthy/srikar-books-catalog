# Code Review — TP1 Capture Purchase Price on Add

**Strengths**
- `readCurrencyField` now centralizes parsing/validation for price, MRP, and purchase price so currency inputs share consistent rules and can be extended from one place (`scripts/admin/inventory.js:44-71`).
- The purchase price input has a dedicated (screen-reader) label plus helper text, keeping the UI compact while ensuring assistive tech users retain context even after typing (`admin.html:121-136`).

**Improvements**
- None beyond routine polish; the current TP1 changes read cleanly and stay aligned with the spec.

**Verdict:** READY TO MERGE
