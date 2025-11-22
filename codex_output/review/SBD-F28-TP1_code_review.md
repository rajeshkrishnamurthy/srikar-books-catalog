# Code Review — Topic SBD-F28-TP1

## Findings
1. **Auto-dismiss timer still fires after manual dismiss (bug-risk)**  
   The new toast dispatcher schedules a timeout for every toast but never clears it when a user dismisses via the close button or `Escape` (`scripts/admin/main.js:66-88`). If a toast is closed early, the pending timeout will still call `dismiss`, triggering `onToastDismiss` a second time and removing an already-removed element. That doubles analytics/telemetry hooks and breaks the TOAST_NOTIFICATIONS contract that `onDismiss` fires once per toast.

## Open Questions
- None.

## Change Summary
- Added an inline toast dispatcher in `scripts/admin/main.js` to register `globalThis.showToast` when the shared anchors are present.
