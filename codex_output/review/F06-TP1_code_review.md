# Code Review — F06-TP1 Multi-Supplier Selection on Book Add

**Strengths**
- Supplier metadata is normalized once via `formatSupplierLabel`, so both the primary dropdown and the new multi-select reuse the same sorting/labeling logic and stay alphabetically ordered (`scripts/admin/inventory.js:45-209`).
- The submission path deduplicates additional supplier IDs, excludes the primary selection, and persists the resulting `supplierIds` array only when it has content, keeping the Firestore document compact (`scripts/admin/inventory.js:255-307`).

**Strengths**
- Supplier metadata is normalized once via `formatSupplierLabel`, so both the primary dropdown and the multi-select stay alphabetically sorted with consistent labels (`scripts/admin/inventory.js:45-239`).
- Snapshot handling now preserves previously selected “Additional suppliers” by reapplying valid selections after rebuilding the multi-select, so admins don’t lose input mid-form (`scripts/admin/inventory.js:220-239`).
- Submission deduplicates secondary supplier IDs, excludes the primary selection, and persists `supplierIds` only when present, keeping documents tidy (`scripts/admin/inventory.js:255-307`).
- `initInventory` explicitly receives `supplierMultiSelect` from `scripts/admin/main.js`, making dependencies clear and resilient to markup changes (`scripts/admin/main.js:36-190`, `scripts/admin/inventory.js:181-239`).

**Improvements**
- None for this topic.

**Verdict:** READY TO MERGE
