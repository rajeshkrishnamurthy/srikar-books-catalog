# Code Review — F11-TP1 Expose Remove Controls Per Line

**Strengths**  
- Each sale-line row now renders a dedicated actions cell with a real `<button>` that sets an `aria-label` describing the target book, making the control discoverable to assistive tech (scripts/admin/salesLineItems.js:300-337; admin.html:420-455).  
- Removal flows track per-line state inside `lineEntries`, so toggling pending confirmation updates the row dataset, button copy, and sr-only live region while ensuring only one line is pending at a time (scripts/admin/salesLineItems.js:364-434).  
- Header locking reuses the existing state machine: when the header becomes invalid, `updateRemoveControlsLock` disables the buttons, adds `aria-disabled`, and clears any pending removal so accidental deletions can’t fire while the header needs attention (scripts/admin/salesLineItems.js:435-452, 478-508).  
- Tests `F11-TP1-001…003` exercise visible affordances, confirmation behavior, live messaging, and lock-state disabling via the shared harness, so regressions in accessibility or state handling will be caught quickly.

**Findings**  
- None.

**Verdict:** READY FOR MERGE
