# Code Review — F08-TP3 Persist Sale and Align UI Copy

**Strengths**  
- `persistSale` now clones the line payloads before building the Firestore document, reports success/error per line, and always resets the busy flag so the submit button is usable after validation failures or backend errors (scripts/admin/salesPersist.js:44-117).  
- `buildSaleDocument` and the Jest harnesses keep totals, timestamps, and legacy button copy updates under test, giving confidence that persistence and UI messaging stay in sync (scripts/admin/salesPersist.js:121-173, tests/spec/admin/F08-TP3-001…004).

**Improvements**  
- None identified for this topic.

**Verdict:** READY FOR MERGE
