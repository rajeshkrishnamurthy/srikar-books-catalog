# Code Review — F11-TP2 Remove Line and Recalculate Draft State

**Strengths**  
- Confirmed removals now go through `confirmRemoval`: the entry is removed from the DOM and `state.lines`, totals recalc on the spot, the sr-only status announces “Removed … from sale,” and auxiliary state (pending id, per-line listeners) is cleaned up (scripts/admin/salesLineItems.js:398-470).  
- The final line removal resets the draft (book memo, supplier select, label, focus) and disables the Persist Sale button, matching the workflow described in the spec (scripts/admin/salesLineItems.js:364-389, 458-477, 555-567).  
- Tests F11-TP2-001…003 drive the harness through real interactions to verify row deletion, totals recalculation, live status logs, and draft resets, so future regressions are caught.

**Findings**  
- `scripts/admin/salesLineItems.js` has grown to ~900 lines and now mixes draft management, hint rendering, supplier dropdown logic, and removal state in a single file. The new removal helpers add more state and DOM plumbing to this already dense module. Consider extracting reusable logic (e.g., supplier dropdown handling, removal status helpers) into smaller modules to keep the sale-line controller maintainable.

**Verdict:** CLEAN WITH MINOR IMPROVEMENTS
