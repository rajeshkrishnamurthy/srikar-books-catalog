Note: Examples in this document are non-normative. The Pattern schema and tier model in AGENTS.md are normative and must guide all future patterns. Do not port example-specific fields into unrelated patterns unless explicitly added to the schema.

# Pattern Registry — Pagination family

## PAGINATION_CONTRACT (type: contract, v1.0.0)
- **Purpose.** Normalize pagination math (clamps, cursors, offsets, summary copy) so upstream data fetches and downstream shells share one datastore-agnostic format.
- **Required params.** `defaultPageSize`.
- **Optional params.** `minPageSize`, `maxPageSize`, `totalItems`, `summaryTemplate`.
- **Adapters.** _None_ (pure helpers).
- **Docs.**
  - Request shape: `{ pageSize, direction, cursorAfter?, cursorBefore?, offset?, filters?, defaults? }`.
  - State shape: `{ pageMeta, summaryText, prevDisabled, nextDisabled, totalItems?, currentOffset, filters, locationParams }`.
- **Accessibility.** Emits `summaryText` plus disabled states so shells can pipe them to aria-live / aria-disabled without bespoke math.
- **Test behaviors.** Page-size clamp, direction-aware cursor mapping, boundary summaries, deterministic disabled states, and stable `locationParams` serialization.

## PAGINATION_CONTROLLER (type: controller, v1.0.0)
- **Purpose.** Promise-aware state machine that consumes the contract, talks to a screen-specific `dataSource`, keeps filters/hash state in sync, and exposes a compact API for shells.
- **Required params.** `defaultPageSize`.
- **Optional params.** `mode`, `initialFilters`, `pageSizeOptions`, `locationKey`, `autoLoad`, `loadMoreLimit`.
- **Adapters.** `dataSource`, `parseLocation`, `syncLocation`, `onStateChange` (all vendor neutral).
- **Docs.**
  - Request shape: `{ pageSize, direction, cursorAfter?, cursorBefore?, offset?, filters? }`.
  - State shape: `{ items, pageMeta, totalItems?, currentOffset?, summaryText, prevDisabled, nextDisabled, isLoading, currentPage, totalPages, mode }`.
  - Mount API: `createPaginationController({ params, adapters, uiTexts, options }) => { getUiState, goNext, goPrev, goToPage, loadMore, setFilters, setPageSize, refresh, syncFromLocation, syncToLocation, destroy }`.
- **Accessibility.** Exposes `state.isLoading`, `state.currentPage`, `state.totalPages`, and `state.summaryText` so shells announce context and toggle `aria-busy` without extra timers.
- **Test behaviors.** Restore location state before first fetch, clamp page size, drop stale cursors, enforce last-write-wins, and keep summary/disabled flags aligned with every public API call.

## PAGINATION_SHELL (type: shell, v1.0.0)
- **Purpose.** Declarative DOM wrapper (summary, Prev/Next, numeric pager, optional page-size select or load-more) that consumes the controller and standardizes markup and ARIA.
- **Required params.** `container`, `summaryEl`, `prevButton`, `nextButton`.
- **Optional params.** `pageSizeSelect`, `pagesContainer`, `mode`, `sticky`, `formatSummary`.
- **Adapters.** `controller`, optional `formatSummary` and `announce` for custom SR copy.
- **Docs.**
  - Request shape: `{ state: controller.getUiState(), event: 'init'|'sync'|'teardown', elements }` where `elements` contains the supplied DOM refs.
  - State shape: `{ domUpdates, eventListeners }` with listeners keyed by control.
  - Mount API: `mountPaginationShell({ params, adapters, uiTexts, options }) => { sync, destroy }`.
- **Accessibility.** Applies `aria-live=polite` to summary, mirrors disabled states with `aria-disabled`, sets `aria-current="page"` on numeric buttons, hides ellipses from SR, and keeps focus on the invoking control.
- **Test behaviors.** Prev/Next disable/aria parity, compressed numeric pager, page-size select wiring, load-more integration, and summary announcements on every sync.

## PAGINATION_SUITE (type: aggregate, v1.0.0)
- **Purpose.** End-to-end pagination package (contract + controller + shell) tuned for admin grids and queues so adopters wire a single factory plus screen-specific adapters.
- **Required params.** `container`, `summaryEl`, `prevButton`, `nextButton`, `defaultPageSize`.
- **Optional params.** `pageSizeOptions`, `pagesContainer`, `pageSizeSelect`, `mode`, `sticky`, `locationKey`, `loadMoreLimit`.
- **Adapters.** `dataSource`, `parseLocation`, `syncLocation`, `onStateChange`, optional `formatSummary`, `announce`.
- **Docs.**
  - Request shape: `{ params, elements, adapters }` where `params` cover pagination knobs, `elements` are DOM anchors, and adapters come from the Manage Bundles / Book Requests contexts.
  - State shape: `{ controllerState, shellState, teardown }`.
  - Mount API: `mountPaginationSuite({ params, adapters, uiTexts, options }) => { destroy() }`.
- **Accessibility.** Keeps container `aria-busy` in sync with controller state, ensures summary stays aria-live, and lets topic-specific `announce()` describe ranges like "Bundles 41-60 of 210" or "Requests 61-70 of 322 open".
- **Test behaviors.** Single-call mounting of controller+shell, propagation of parseLocation defaults, graceful adapter rejection handling, preservation of paging context when rows mutate, and mode switching (pager vs load-more) via params only.
- **Composes.** `PAGINATION_CONTRACT`, `PAGINATION_CONTROLLER`, `PAGINATION_SHELL`.
- **Primary adopters.** Manage Bundles pagination and Open Book Requests queue reuse this aggregate to avoid per-screen rewrites.

# Pattern Registry — Inline Bundle Composer

## INLINE_BUNDLE_PANEL_SHELL (type: shell, v1.1.0)
- **Purpose.** Render the inline bundle composer drawer beside listing views with consistent triggers, chips, and bundle form controls.
- **Required params.** `container`, `panelHeading`, `triggerSelector`, `bookList`, `bundleNameInput`, `bundlePriceInput`, `recommendedPrice`, `totalPrice`, `saveButton`, `resetButton`.
- **Optional params.** `overlay`, `closeButton`, `existingBundleSelect`, `emptyState`, `bookRowSelector`, `pinButton`, `viewBundleLink`, `totalMrp`.
- **Adapters.** `controller` (subscribe/dispatch API), `formatPrice(valueInMinorUnits, currency)`, `announce(message, politeness)`.
- **UI texts.** Panel title, empty state copy, bundle name/price labels, recommended/total price labels, total MRP label, save and clear labels.
- **Docs.**
  - Request shape: `{ params, adapters, uiTexts }` where params provide DOM refs/selectors for triggers and form fields (including optional totalMrp).
  - State shape: `{ isOpen, pinned, activeBookIds, fieldStatus, recommendedPriceText, totalPriceText, totalMrpText }`.
  - Mount API: `mountInlineBundlePanel(container, { params, adapters, uiTexts, options }) => { addBook(book, triggerButton), reset(), destroy() }`.
  - Module path: `src/ui/patterns/inline-bundle-panel-shell/index.js`.
- **Accessibility.** Drawer uses `role="region"` plus `aria-labelledby` for the heading, moves focus to the heading when opened, mirrors controller validation via `aria-invalid`, and pipes recommended/total/total-MRP updates through `aria-live`.
- **Test behaviors.** Opening from any trigger updates focus + `aria-expanded`, chips render in selection order with remove buttons calling `controller.dispatch('removeBook', bookId)`, Save/Reset track disabled and `aria-busy` state, recommended price placeholder swaps to formatted copy via `formatPrice`, total MRP renders with placeholder copy when missing, and the drawer collapses automatically when zero selections remain (unless pinned).

## BUNDLE_PRICE_RECOMMENDATION (type: contract, v1.0.0)
- **Purpose.** Reusable contract to compute recommended bundle price, total sale price, and total MRP once enough books are selected.
- **Required params.** `currency`, `recommendationThreshold`.
- **Optional params.** `debounceMs`, `maxBooks`.
- **Adapters.** `fetchPriceRecommendation({ bookIds, currency }) => Promise<{ recommendedPriceMinor: number|null, totalSalePriceMinor: number|null, totalMrpMinor?: number|null }>`.
- **UI texts.** Pending copy and placeholder symbols for fallback/aria-live stability.
- **Docs.**
  - Request shape: `{ params, adapters, options }` where params cover currency and thresholds and adapters provide the recommendation fetcher.
  - State shape: `{ recommendedPriceMinor, totalSalePriceMinor, totalMrpMinor, status, lastUpdated }`.
  - Mount API: `computeBundlePriceRecommendation({ bookIds, currency, options }) => Promise<{ recommendedPriceMinor, totalSalePriceMinor, totalMrpMinor, status, lastUpdated }>>`.
- **Accessibility.** Emits numeric fields intended for aria-live regions; placeholders keep screen readers from announcing undefined values.
- **Test behaviors.** Fires only when selection count meets the threshold with debounced requests, surfaces nulls on adapter failure, derives total MRP when book metadata is present while clamping missing data to placeholders, and returns timestamps to support stale-state handling.

## INLINE_BUNDLE_COMPOSER_CONTROLLER (type: controller, v1.1.0)
- **Purpose.** Maintain bundle context, compute pricing, enforce validation, and orchestrate persistence for inline bundle creation.
- **Required params.** `currency`, `pricePrecision`, `recommendationThreshold`.
- **Optional params.** `bundleId`, `maxBooks`, `persistSessionKey`, `defaultBundleNamePrefix`, `clock`, `analytics`.
- **Adapters.** `fetchPriceRecommendation({ bookIds, currency })`, `loadBundle(bundleId)`, `saveBundle({ bundleName, bundlePriceMinor, bookIds, bundleId? })`, `persistDraft(state)`, `onStateChange(state)`.
- **UI texts.** Default bundle name prefix, price placeholder, copy for recommended-price pending state, duplicate-book error.
- **Docs.**
  - Request shape: `{ params, adapters, options }` covering currency/precision, debounce timers, and analytics hooks.
  - State shape: `{ bundleId, books, bundleName, bundlePriceMinor, recommendedPriceMinor, totalSalePriceMinor, totalMrpMinor, validationErrors, isSaving, resumeBundleId, lastInteraction }`.
  - Mount API: `createInlineBundleComposerController({ params, adapters, uiTexts, options }) => { addBook(book), removeBook(bookId), updateFields(partial), setExistingBundle(bundleId), reset(), saveBundle(), getState(), subscribe(listener), destroy() }`.
- **Accessibility.** Emits `lastAnnouncedMessage` so shells can route it to `aria-live`, tracks a `focusRestoreTarget` after destructive actions, and exposes `validationErrors` keyed per field to keep `aria-describedby` mappings deterministic.
- **Test behaviors.** First `addBook()` spawns a new context and ignores duplicates, pricing calls only fire once selection count meets the threshold, controller derives total MRP from selected book metadata when present, validation gates `saveBundle()`, resets preserve draft metadata when requested, and concurrent `saveBundle()` calls coalesce while `isSaving` is true.

## INLINE_BUNDLE_COMPOSER (type: aggregate, v1.1.0)
- **Purpose.** Ship a complete inline bundle composer (shell + controller) so list views mount one factory to add books, preview pricing, and save bundles without leaving the page.
- **Required params.** `container`, `panelHeading`, `triggerSelector`, `bookList`, `bundleNameInput`, `bundlePriceInput`, `recommendedPrice`, `totalPrice`, `saveButton`, `currency`.
- **Optional params.** `existingBundleSelect`, `resetButton`, `overlay`, `closeButton`, `pinButton`, `viewBundleLink`, `emptyState`, `persistSessionKey`, `maxBooks`, `totalMrp`, `recommendationThreshold`.
- **Adapters.** `fetchPriceRecommendation`, `loadBundle`, `listExistingBundles`, `saveBundle`, `linkBooks`, `formatPrice`, `toastSuccess`, `toastError`, `announce`.
- **UI texts.** Panel title, empty state, existing-bundle label, save/update labels, clear bundle label, total MRP label, optional View bundle CTA label.
- **Docs.**
  - Request shape: `{ params, adapters, uiTexts }` where params include DOM anchors and controller tuning knobs (including optional totalMrp and recommendationThreshold).
  - State shape: `{ controllerState, shellState, teardown }`.
  - Mount API: `mountInlineBundleComposer({ params, adapters, uiTexts, options }) => { controller, shell, destroy() }`.
- **Accessibility.** Keeps price summaries and toasts `aria-live`, links triggers to the drawer via `aria-controls`, traps focus while saving, and routes error summaries to focus before returning it to the Save button.
- **Test behaviors.** First trigger mounts the aggregate once, existing-bundle selection hydrates controller state and shell chips, recommendation calls auto-fire once the selection threshold is met and stream formatted recommended/total prices plus total MRP to the shell, `saveBundle()` calls `linkBooks()` only after success, error paths keep context intact while surfacing `toastError`, and success paths emit `toastSuccess` plus view-bundle link updates before optionally clearing state.
- **Composes.** `INLINE_BUNDLE_PANEL_SHELL`, `INLINE_BUNDLE_COMPOSER_CONTROLLER`, `BUNDLE_PRICE_RECOMMENDATION`.
