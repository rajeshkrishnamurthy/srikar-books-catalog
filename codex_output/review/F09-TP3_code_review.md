# Code Review — F09-TP3 Draft Line Workflow and Focus Reset

**Strengths**  
- `applyHeaderLock` centralizes the lock/unlock behavior: it toggles dataset attributes, disables inputs, clears guidance, and calls `focusBookInput` only when the header is ready, which keeps the UX consistent (scripts/admin/salesLineItems.js:312-339).  
- `resetDraft` now clears dataset-backed snapshots, hints, and re-focuses the book-title field after each successful line, matching the rapid-entry workflow described in the specs (scripts/admin/salesLineItems.js:267-289).  
- Tests exercise the new header-state adapter, ensuring locks engage, unlock without retyping, focus resets, and relocks fire when the header becomes invalid again (tests/spec/admin/F09-TP3-001…004).

**Findings**  
1. The module is still not wired into the real admin page. `initSaleLineItems` is only imported inside the Jest harness (tests/fixtures/salesLineItemsHarness.js:21-38); no production script calls it, and `admin.html` doesn’t contain any of the required `saleLine*` elements. All of the new locking/focus logic therefore runs only in tests—admins still have no sale-line UI. We need to render the draft form in `admin.html` and initialize it (probably from `scripts/admin/main.js`) so these behaviors reach users.  
2. Even after wiring, locking is opt-in: when callers omit `options.headerState`, `buildHeaderState` returns an object whose `isReady()` always reports `true` and `onReadyChange` never fires (scripts/admin/salesLineItems.js:32, 498-509). Because no production code provides a real header state yet, the draft will start unlocked and never relock when the header becomes invalid, contradicting every spec in F09-TP3. Consider defaulting to “not ready” (so the form stays locked until a real header signals readiness) or throwing when `headerState` is missing to prevent silent failure.

**Verdict:** NEEDS WORK
