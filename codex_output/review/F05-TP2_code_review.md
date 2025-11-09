# Code Review — F05-TP2 Edit or Remove Supplier Records

**Strengths**
- `scripts/admin/main.js:1-183` now imports the full Firebase surface (`doc`, `updateDoc`, `deleteDoc`, `limit`) and passes it through to `initSupplierMaster`, so the edit/delete paths exercised in tests actually run in the live admin console.
- `scripts/admin/suppliers.js:195-225` registers submit/cancel/list handlers once and `dispose()` removes all of them (plus the snapshot subscription), preventing duplicate event firing after re-auth or repeated harness setup.
- The module keeps edit mode, duplicate prevention, and delete gating cohesive: the same normalized `nameKey` is reused for add/update, the UI exposes a cancel affordance, and deletions still run through `supplierHasBooks` with a short-circuited query (`scripts/admin/suppliers.js:121-270`).

**Improvements**
- None for this topic.

**Verdict:** READY TO MERGE
