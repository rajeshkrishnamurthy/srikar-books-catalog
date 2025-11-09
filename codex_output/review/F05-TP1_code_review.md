# Code Review — F05-TP1 Create Supplier Records

**Strengths**
- Supplier management now exists in the actual admin UI: the dedicated section in `admin.html` wires labelled inputs, inline helper text, and the list container, while `scripts/admin/main.js` calls `initSupplierMaster` with real DOM nodes and Firebase deps so the feature is usable outside of tests (`admin.html:231-254`, `scripts/admin/main.js:8-171`).
- `scripts/admin/suppliers.js` derives a normalized `nameKey`, checks duplicates against both the live snapshot and a server-side query via `where('nameKey','==',...)`, and stores the key with each payload. This closes the race where simultaneous submissions could slip through and gives Firestore a stable field to index for future lookups (`scripts/admin/suppliers.js:20-119`).
- Payload construction, display formatting, and normalization helpers stay centralized, keeping the submit handler small and ensuring every saved row renders consistently in the alphabetized list (`scripts/admin/suppliers.js:90-154`).

**Improvements**
- None for this topic.

**Verdict:** READY TO MERGE
