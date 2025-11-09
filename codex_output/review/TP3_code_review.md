# Code Review — TP3 Admin Visibility of Purchase Price

**Strengths**
- `formatPurchasePriceText` wraps placeholder, numeric guardrails, and locale-aware formatting in one helper so both available and sold rows stay consistent and easy to extend (`scripts/admin/inventory.js:45`).
- `rowHTML` now renders a dedicated `.purchase-price` block within each row, which means the new data point is part of the shared renderer used by both lists instead of duplicating markup in multiple code paths (`scripts/admin/inventory.js:70`).

**Improvements**
- None identified for this topic. Residual risk: if future detail panels (beyond the list rows) should show the same value, remember to reuse `formatPurchasePriceText` to keep the phrasing consistent.

**Verdict:** READY TO MERGE
