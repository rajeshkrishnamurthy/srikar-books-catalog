# INLINE_BUNDLE_PANEL_SHELL Reuse Migration — v1.1.0

## Summary
- Extracted the inline composer drawer wiring into `src/ui/patterns/inline-bundle-panel-shell/index.js` with the standard `mount(container, { params, adapters, uiTexts })` API.
- Updated `scripts/admin/inventory.js` to consume the factory and expose the returned `addBook/reset` helpers instead of a bespoke local constructor.
- Added a placeholder `styles.css` so adopters have a scoped target for future theming.

## Files Updated
- `src/ui/patterns/inline-bundle-panel-shell/index.js`
- `src/ui/patterns/inline-bundle-panel-shell/styles.css`
- `scripts/admin/inventory.js`
- `codex_output/patterns.json`
- `codex_output/patterns.md`

## Adoption Guidance
1. Import the factory: `import { mount as mountInlineBundlePanelShell } from 'src/ui/patterns/inline-bundle-panel-shell/index.js';`
2. Call `mount` with the composer container (or selector) plus the required params (panel heading, trigger selector, book list, bundle name/price fields, totals, save/reset buttons, empty state, close button).
3. Use the returned `addBook(book, triggerButton)` helper wherever book actions live. This will open the panel, manage focus, and append chips with no extra DOM wiring.
4. Call `reset()` (or wire the provided reset/close buttons) to clear selections and hide the panel.
