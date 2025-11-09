# Code Review — TP4 Hide Purchase Price from Public Catalog

**Strengths**
- `mapPublicDoc` now delegates to an allowlist-based `pickPublicFields`, so only known-safe properties reach the public UI no matter how Firestore evolves (`scripts/index/catalogService.js:1-30`).
- The card renderer relies on `escapeHtml`/`compactText`, so even after widening the content surface the markup stays injection-safe (`scripts/index/render.js:34-55`).
- WhatsApp copy is produced through `purchaseMessage`, keeping user-facing text free of pricing details and easy to tweak in one spot (`scripts/lib/wa.js:4-7`).
- Removing the unused `settings` import keeps `render.js` tidy and avoids lint/bundler noise (`scripts/index/render.js:1-4`).

**Improvements**
- None; previous privacy and cleanliness issues are addressed.

**Verdict:** READY TO MERGE
