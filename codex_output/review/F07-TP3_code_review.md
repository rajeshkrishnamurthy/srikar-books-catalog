# Code Review — F07-TP3 Customer Lookup for Sales

**Strengths**
- `notifySelectionCleared` centralizes all the “selection invalidated” paths so every programmatic reset emits `onSelect(null)` (`scripts/admin/customerLookup.js:31-43`, `scripts/admin/customerLookup.js:67-79`, `scripts/admin/customerLookup.js:108-118`, `scripts/admin/customerLookup.js:174-186`).
- Search state is now split into base vs. filtered buffers, so realtime snapshots keep the default list fresh without clobbering an active query (`scripts/admin/customerLookup.js:18-61`, `scripts/admin/customerLookup.js:108-120`, `scripts/admin/customerLookup.js:236-307`).
- `runLookupQuery` still defends against stale responses and only paints results when the awaited keyword matches the current query (`scripts/admin/customerLookup.js:140-186`).

**Improvements**
- None. Previous findings are resolved and the lookup behaves predictably, so no blocking issues remain.

**Verdict:** READY FOR MERGE
