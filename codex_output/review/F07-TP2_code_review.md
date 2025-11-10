# Code Review — F07-TP2 Edit Customer Records

**Strengths**
- Edit-mode logic stays inside `scripts/admin/customers.js`, so the DOM glue in `admin.html` / `scripts/admin/main.js` only forwards refs and Firebase deps, which keeps concerns separated.
- `buildCustomerEditPayload` mirrors the add helper, preserving `createdAt` while recalculating `customerKey` and WhatsApp digits; this symmetry makes the RED/Green tests easy to trust.
- `initCustomerMaster` now returns a disposer that tears down submit/cancel/listeners and the Firestore snapshot, and `scripts/admin/main.js:228-260` stores that API so `onSignOut` (and re-auth) can clean up before re-initializing.
- Duplicate detection uses `limit(2)` even when `excludeId` is supplied, so edit-mode checks stay bounded while still filtering out the current record (`scripts/admin/customers.js:349-370`).

**Improvements**
- None — the topic implementation now aligns with the specs and handles auth cycles safely.

**Verdict:** READY FOR MERGE
