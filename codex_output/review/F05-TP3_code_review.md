# Code Review — F05-TP3 Attach Supplier on Book Creation

**Strengths**
- Supplier streaming now has a single rendering path: `subscribeSuppliersForAdd` just forwards the sorted snapshot to `inventoryApi.setSuppliers`, and the inventory module handles all dropdown DOM updates (placeholder, disabled state, labels) so there is no duplicate markup to maintain (`scripts/admin/main.js:89-190`, `scripts/admin/inventory.js:183-209`).
- The supplier snapshot listener is tracked and torn down on sign-out or before re-subscribing, preventing multiple live listeners from stacking up during auth transitions (`scripts/admin/main.js:90-118`, `scripts/admin/main.js:209-212`).
- Validation still enforces that `supplierId` exists in the latest `supplierIds` set before persisting, which protects books from referencing deleted suppliers and keeps the UI copy consistent with the Supplier Master (`scripts/admin/inventory.js:234-270`).

**Improvements**
- None for this topic.

**Verdict:** READY TO MERGE
