# Code Review — F09-TP2 Auto-Fill Supplier and Price Context

**Strengths**  
- `applyBookSelection` now stamps `data-book-history` on the summary node and `extractBookFromDom` normalizes it, so preloaded drafts retain supplier + price context across reloads (scripts/admin/salesLineItems.js:123-195).  
- Hint panels remain optional; `hasRequiredRefs` only enforces the core draft inputs/totals and `renderSaleLineHints` no-ops when an element is missing, allowing progressive rollout (scripts/admin/salesLineItems.js:7-30, 346-359, 485-495).  
- Formatting logic lives in `salesLineHints.js` + Jest coverage ensures supplier/purchase/selling hints and the `formatPriceHint` helper behave consistently (scripts/admin/salesLineHints.js:1-75; tests/spec/admin/F09-TP2-001…004; tests/unit/admin/F09-TP2-001_FormatPriceHint.test.js).

**Findings**  
1. The new sale-line module is still not wired into the real admin page. `initSaleLineItems` is only imported by the Jest harness (tests/fixtures/salesLineItemsHarness.js:21-38); no production script calls it, and `admin.html` contains none of the `saleLine*` markup IDs that the module expects. As a result every improvement (hints, locking, focus reset) remains unreachable in the actual UI. We need an entrypoint (likely in `scripts/admin/main.js`) that renders the sale-line form and passes real refs/options into `initSaleLineItems`.  
2. Even after it’s wired, header gating is opt-in and currently defaults to “ready.” When `initSaleLineItems` is called without `options.headerState`, `buildHeaderState` returns `{ isReady: () => true }` (scripts/admin/salesLineItems.js:498-509), so the draft never locks or relocks. Until the real sale header passes its state, the module will always behave as unlocked—contrary to the spec’s “block until header valid” requirement. Consider defaulting to `false` (locked) or throwing if `headerState` is missing to avoid silently shipping an always-unlocked draft.

**Verdict:** NEEDS WORK
