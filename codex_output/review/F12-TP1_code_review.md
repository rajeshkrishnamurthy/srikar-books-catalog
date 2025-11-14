# Code Review — F12-TP1 Create Bundle (Supplier-Scoped + Default Pricing)

**Strengths**  
- The bundle UI now surfaces the discount math inline (`scripts/admin/bundles.js:247-252`), so admins can sanity-check the rupee totals that drove the recommended price without leaving the panel.

**Findings**  
1. `normalizeBook` now prioritizes the `Price` field but it never falls back when that field is present yet non-numeric (e.g., `'₹400'`, `'400/-'`, or an empty string). Because `??` stops at the first defined value, any formatted-but-non‑numeric `Price` blows up into `Number.isFinite(parsedPrice) === false`, causing the function to return `0` rather than using `sellingPrice`/`mrp` (`scripts/admin/bundles.js:423-436`). That keeps `state.totalPrice` at ₹0, disables submissions, and defeats the Price-field fix for the exact data this feature is supposed to support. Treat unparseable values (or `<= 0`) as “missing” so the existing fallbacks still run, or strip formatting before parsing.
2. The success toast after `addDoc` never appears, because `setMessage('Bundle created as Draft…')` is followed immediately by `form.reset()`, which synchronously fires the registered `reset` handler that calls `resetBundleState()` and clears the message (`scripts/admin/bundles.js:87-99, 313-333`). Users just see the form jump back to its initial state with no confirmation. Skip the manual `resetBundleState()` call (let the `reset` event handle it) and move the success message update after the reset so it survives, or temporarily remove the reset handler before calling `form.reset()`.

**Verdict:** CHANGES REQUESTED
