# Pattern Registry — Pagination family

## PAGINATION_CONTRACT (Tier: CONTRACT, v1.0.0)
- **Purpose.** Pure helper bundle that standardizes pagination math (page-size clamps, cursor selection, summary copy, hash params) for all list views.
- **Params.** `defaultPageSize` (required); optional `minPageSize`, `maxPageSize`, `totalItems`, `summaryTemplate`.
- **Request shape.**
  - `pageSize: number` desired slice before clamping.
  - `direction: 'forward'|'backward'` (defaults to `forward`).
  - `cursorAfter?` (`direction='forward'`) / `cursorBefore?` (`direction='backward'`).
  - `offset?: number`, `filters?: Record<string,string|number>`, `defaults?: { pageSize?, minPageSize?, maxPageSize? }`.
- **Result shape.**
  - `pageMeta: { count, pageSize, hasNext, hasPrev, nextCursor?, prevCursor? }`.
  - `summaryText`, `prevDisabled`, `nextDisabled`, `totalItems?`, `currentOffset`, `filters`, `locationParams`.
- **Public API.** `createPaginationRequest`, `buildPaginationState`, `buildPaginationShellState`, `buildCatalogPaginationUi`, `buildPaginationLocationParams`, `parsePaginationFromLocation`.
- **Adapters.** _None_ (pure functions).
- **Accessibility.** Emits `summaryText` and disabled states for downstream aria-live/aria-disabled usage; no DOM work here.
- **Test behaviors.**
  1. Requested pageSize clamps between min/max/default values.
  2. Direction switch flips between start/end cursor usage.
  3. `hasNext/hasPrev` booleans + cursors normalize even for empty pages.
  4. Summary/disabled states stay deterministic for first/last/empty slices.
  5. `locationParams` encodes filters + pagination inputs with stable keys.
- **Referenced topics.** F18-TP1, F19-TP1, SBD-F20-TP1, SBD-F21-TP1, SBD-F22-TP1.

---

## PAGINATION_CONTROLLER (Tier: CONTROLLER, v1.0.0)
- **Purpose.** Promise-aware state machine that wraps the contract helpers, coordinates adapters (dataSource, parse/sync location, onStateChange), and exposes a UI-ready API for pager or load-more flows.
- **Params.** Required `defaultPageSize`; optional `mode`, `initialFilters`, `pageSizeOptions`, `locationKey`, `autoLoad`, `loadMoreLimit`.
- **Adapters.**
  - `dataSource({ request, filters, offset })` → Promise or result matching the contract state.
  - `parseLocation()` → `{ pageSize?, direction?, cursorAfter?, cursorBefore?, offset?, filters? }`.
  - `syncLocation(params)` writes hash/query.
  - `onStateChange(state)` notifies panels rendering rows.
- **Request shape.** `pageSize`, `direction ('forward'|'backward'|'absolute')`, optional `cursorAfter`, `cursorBefore`, `offset`, `filters`.
- **Result shape.** `{ items, pageMeta { hasNext, hasPrev, nextCursor?, prevCursor?, pageSize, count }, totalItems?, currentOffset?, summaryText, prevDisabled, nextDisabled, isLoading, currentPage, totalPages, mode }`.
- **Public API.** `getUiState`, `goNext`, `goPrev`, `goToPage`, `loadMore`, `setFilters`, `setPageSize`, `refresh`, `syncFromLocation`, `syncToLocation`, `destroy`.
- **Accessibility.** Surfaces `state.isLoading`, `state.summaryText`, `state.currentPage`, `state.totalPages`, and disabled flags so shells can announce changes and toggle `aria-busy` without bespoke math.
- **Test behaviors.**
  1. Consumes `parseLocation()` before the first fetch to restore paging + filters.
  2. Clamps `pageSize` to provided options and resets to page 1 on filter/size changes.
  3. Drops stale cursors if offsets exceed totals and re-requests a safe slice.
  4. Enforces last-write-wins when multiple dataSource promises resolve out of order.
  5. Keeps `isLoading`, summary text, and disabled states in sync with every public API call.
- **Referenced topics.** F18-TP5, F19-TP1→TP5, SBD-F20-TP1→TP3, SBD-F21-TP1→TP3, SBD-F22-TP1→TP3.

---

## PAGINATION_SHELL (Tier: SHELL, v1.0.0)
- **Purpose.** DOM wrapper that binds the controller to shared markup (summary text, Prev/Next buttons, numeric pager, optional page-size select or load-more CTA) with consistent classes and accessibility.
- **Params.** Required `container`, `summaryEl`, `prevButton`, `nextButton`; optional `pageSizeSelect`, `pagesContainer`, `mode`, `sticky`, `formatSummary`.
- **Adapters.** `controller` (PAGINATION_CONTROLLER instance), optional `formatSummary(summaryText, state)` and `announce(text)` for custom SR messaging.
- **Request shape.** `{ state: controller.getUiState(), event: 'init'|'sync'|'teardown', elements: { container, summaryEl, prevButton, nextButton, pagesContainer?, pageSizeSelect? } }`.
- **Result shape.** `{ domUpdates: text/attribute toggles, eventListeners: { prev, next, pageButton, pageSize, loadMore }, teardown: removes listeners + aria attrs }`.
- **Public API.** `mount(config) -> { sync, cleanup }`, `sync()`, `cleanup()`.
- **Accessibility.** Adds `aria-live=polite` to summary, toggles `aria-busy` on the container, mirrors disabled state via `aria-disabled`, sets `aria-current="page"` on numeric buttons, hides ellipses from SR, and includes upcoming ranges in load-more labels.
- **Test behaviors.**
  1. Prev/Next disable (and apply `aria-disabled`) whenever controller reports `prevDisabled`/`nextDisabled` or busy state.
  2. Numeric pager compresses long sequences with ellipses and highlights the current page.
  3. Page-size select dispatches `controller.setPageSize` and summary updates accordingly.
  4. Load-more button calls `controller.loadMore` and updates summary after fulfillment.
  5. Summary text changes trigger aria-live announcements without stealing focus.
- **Referenced topics.** F18-TP2, F18-TP3, F19-TP2/TP4/TP5, SBD-F20-TP2, SBD-F21-TP2, SBD-F22-TP2.
