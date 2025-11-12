# Code Review — F09-TP4 No-Match Error Handling

**Strengths**  
- `scripts/admin/salesTitleAutocomplete.js:135-210` now dispatches an `input` event when it updates the hidden `bookId` and calls `onBookSelect(null)` whenever a no-match occurs, so downstream consumers are explicitly notified that the selection vanished.  
- `scripts/admin/salesLineItems.js:70-110` listens to those hidden-input changes, clears `state.selectedBook`, resets summary datasets/hints, and re-evaluates `updateAddButtonState`, which immediately disables the Add-line button after a no-match.  
- Production wiring is complete: `admin.html:282-348` renders the sale-line form, and `scripts/admin/main.js:431-474` bridges the autocomplete and line-draft modules, so the behavior verified in tests now runs in the real UI.  
- The new wiring spec `tests/spec/admin/F09-TP4-005_WiringNoMatchKeepsDraftDisabled.spec.js` covers this end-to-end path, ensuring future regressions are caught quickly.

**Findings**  
- None.

**Verdict:** READY FOR MERGE
