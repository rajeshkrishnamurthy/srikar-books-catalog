# Code Review — F11-TP3 Persist Clean Payload After Removals

**Strengths**  
- `confirmRemoval` now updates `state.lines`, recalculates totals, logs status entries, and disables Persist when no lines remain, so the in-memory state matches the DOM before persisting (scripts/admin/salesLineItems.js:398-470).  
- Persist wiring (`scripts/admin/main.js:600-650` + `scripts/admin/salesPersist.js`) consumes `saleLineItemsApi.getLines()`, so the Firestore payload only contains the remaining lines; tests confirm removed lineIds never leak into the saved document.  
- Empty drafts keep `salePersistBtn` disabled with `aria-disabled` and surface “Add at least one line item before saving,” preventing accidental submits when the cart is empty (scripts/admin/salesLineItems.js:555-567; tests/spec/admin/F11-TP3-002).
- `tests/spec/admin/F11-TP3-001…003` exercise the harness + persist flow end-to-end, ensuring removal, totals, and status messaging stay in sync with real behavior.

**Findings**  
- None.

**Verdict:** READY FOR MERGE
