# Code Review — SBD-F23-TP3 Selected Books List and Reset

**Strengths**
- Chips are rebuilt via `renderList` so every entry receives a fresh `[data-test='inlineBundleRemove']` button with an aria-label that includes the current title, keeping the DOM consistent and screen-reader friendly (src/ui/patterns/inline-bundle-panel-shell/index.js:158-170,41-68).
- The reset flow only prompts when the bundle holds multiple books and injects the current count into the dialog text, matching the spec’s confirmation requirements without blocking single-selection clears (src/ui/patterns/inline-bundle-panel-shell/index.js:262-271).

**Findings**
- [bug-risk] Removing the final chip after other chips have been cleared returns focus to the wrong `Add to bundle` trigger. `state.activeTrigger` is only updated when `setTriggerState` runs during `addBook`, and `removeBookAtIndex` always passes `state.activeTrigger` into `collapseAfterEmpty` when the list goes empty (src/ui/patterns/inline-bundle-panel-shell/index.js:176-185,205-223). If an admin adds books A then B, removes B, and finally removes A, `state.activeTrigger` still points at B’s button, so aria-expanded/focus reset on the wrong row. Please store the originating trigger per chip (alongside the id/title) or update `state.activeTrigger` when a chip is removed so the last remaining chip can return focus to its own trigger. Add a RED test covering “add two → remove one → remove last” to prevent regressions.
- [bug-risk] Clicking the Close button leaves the associated `[data-test='bookAddToBundle']` control with `aria-pressed="true"` even though the drawer is hidden. `closeComposer` only flips `aria-expanded` back to `false` (src/ui/patterns/inline-bundle-panel-shell/index.js:188-193), so assistive tech still announces the trigger as pressed after the panel collapses. Mirror the cleanup done in `collapseAfterEmpty` by also clearing `aria-pressed` (and possibly `state.activeTrigger`) whenever the drawer closes outside of a full reset.

**Verdict:** CHANGES REQUESTED
