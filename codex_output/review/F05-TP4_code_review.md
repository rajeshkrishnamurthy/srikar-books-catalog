# Code Review — F05-TP4 Edit Book-Supplier Mapping

**Strengths**
- Supplier streaming is centralized: `applySuppliersToConsumers` shares snapshots with both the add-form inventory module and the edit dialog, keeping dropdowns in sync without redundant listeners (`scripts/admin/main.js:82-220`).
- `initAuth` now disposes inventory/editor instances on sign-out, so event handlers don’t stack across auth transitions (`scripts/admin/main.js:212-220`).
- The inventory module owns supplier `<select>` rendering (sorting, placeholder, label formatting) and exposes `setSuppliers`, which the editor consumes via a shared helper, eliminating drift between add/edit dropdowns (`scripts/admin/inventory.js:183-209`, `scripts/admin/editor.js:136-170`, `tests/fixtures/adminEditHarness.js:18-35`).
- Edit validation still blocks missing or stale supplier selections before `updateDoc`, clearing invalid options and guiding the admin to pick a valid supplier (`scripts/admin/editor.js:172-274`).

**Improvements**
- None for this topic.

**Verdict:** READY TO MERGE
