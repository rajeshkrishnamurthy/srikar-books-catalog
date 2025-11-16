# Admin Purchase Price Handling — Topics

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| TP1 | Capture Purchase Price on Add | Allow admins to enter and persist a purchase price when creating a book record. | — | An authenticated admin opens the Add Book form. | They enter a numeric purchase price and submit the form. | The value is validated (required, non-negative) and written to Firestore with the new book. |
| TP2 | Edit Stored Purchase Price | Enable admins to adjust the saved purchase price on existing books without recreating them. | TP1 | A book exists in inventory with or without a purchase price set. | An admin invokes the edit action and updates the purchase price field. | The new value passes validation and updates the Firestore document, reflecting immediately in the UI. |
| TP3 | Admin Visibility of Purchase Price | Surface each book's purchase price to admins within list/detail panels for quick reference. | TP1 | An admin loads the inventory dashboard or detail drawer. | Books are rendered in the admin UI. | Each entry shows the stored purchase price (formatted currency or placeholder when missing) without affecting actions. |
| TP4 | Hide Purchase Price from Public Catalog | Guarantee purchase price data never appears in the public catalog payloads or UI. | TP1 | A visitor browses the public catalog. | Client-side code queries Firestore and renders cards. | Purchase price fields are omitted or stripped before rendering so no cost data leaks publicly. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all topics.
- Reuse validation utilities across TP1–TP3 to keep behavior consistent.
- TP4 must also verify Firestore security rules to prevent accidental read exposure.

# Feature: Supplier Master Management (F05)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F05-TP1 | Create Supplier Records | Allow admins to add supplier entries with required name and location data. | — | An admin opens the Supplier Master view. | They submit the form with name and location. | A new supplier document persists and appears instantly without duplicates. |
| F05-TP2 | Edit or Remove Supplier Records | Let admins update supplier details or remove suppliers that are no longer in use. | F05-TP1 | A supplier entry already exists. | An admin edits the name/location or requests deletion. | Updates save with audit safety; deletions are blocked if books still reference the supplier. |
| F05-TP3 | Attach Supplier on Book Creation | Require selecting an existing supplier whenever a new book is created. | F05-TP1 | An admin is adding a book and the supplier master already has active entries. | They pick a supplier (or attempt without selecting) and submit the form. | Valid submissions persist the supplier reference; missing/invalid selections are blocked with feedback. |
| F05-TP4 | Edit Book-Supplier Mapping | Enable admins to change the supplier linked to an existing book. | F05-TP3 | A book already has a supplier association. | An admin selects a different supplier and confirms. | The book updates with the new supplier and admin views refresh to match. |

Notes:
- Area: Admin / Supplier Master for F05-TP1/F05-TP2, Admin / Catalog for F05-TP3/F05-TP4.
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all F05 topics.

# Feature: Book Sale Settlement (F06)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F06-TP1 | Record Sale Status and Price | Let admins toggle inventory status and capture the sale price in one flow. | — | A book exists and is ready to be marked as sold. | The admin switches the sale status and enters a sale price before saving. | Status and validated sale price persist together, updating stock counters. |
| F06-TP2 | Compute Revenue Shares | Auto-calculate Srikar and supplier payout amounts from sale/cost prices. | TP1, F06-TP1 | The book already stores a cost price and the sale price was captured. | The admin confirms the sale. | The system stores Srikar's share as (sale-cost)/2 and supplier share as cost + (sale-cost)/2 with rounding applied. |
| F06-TP3 | Associate Buyer With Sale | Link every sold book to a buyer from the customer master. | F06-TP1, F07-TP1 | Customer records exist and a book is being marked sold. | The admin searches/selects (or creates) a buyer while confirming the sale. | The sale record stores the buyer reference and surfaces it in reports. |

Notes:
- Ensure sale price is required when status is "sold" and enforce positive currency values.
- Shares should be previewed before save and reuse existing currency-format utilities.
- Buyer selection should block completion until a valid customer is chosen.

# Feature: Customer Master Management (F07)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F07-TP1 | Add Customer Records | Capture customer name, address, location, and WhatsApp for reuse in sales. | — | An admin opens the Customer Master module. | They submit the add form with all required fields. | A validated customer document is created with normalized phone data. |
| F07-TP2 | Edit Customer Records | Update customer details without breaking historical sale links. | F07-TP1 | A customer entry already exists. | An admin opens the record and changes address/location/WhatsApp. | Changes persist with updated timestamps and reflect anywhere the customer is referenced. |
| F07-TP3 | Customer Lookup for Sales | Provide searchable customer listings to other workflows (e.g., sales settlement). | F07-TP1 | An admin opens the customer lookup with no filter applied. | They enter a search term and filter. | Until a query exists the list stays empty with guidance; once text is provided, only matches render and the selected ID is emitted back to the calling flow. |

Notes:
- Deduplicate by name + WhatsApp and enforce consistent phone formatting.
- Editing should warn before clearing required data and keep immutable IDs for references.
- Lookup service must keep the list empty/guided until a search runs, enforce debounce/min-length before querying, and integrate cleanly with F06-TP3 while exposing minimal fields for selection.

# Feature: Sales Entry Management (F08)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F08-TP1 | Capture Sale Header | Require selecting a customer and sale date before adding sold books. | F07-TP1 | An admin launches the Add Sale workflow and customers exist. | They pick a customer and sale date. | The sale form locks those values and blocks progress until both are valid. |
| F08-TP2 | Add Sale Line Items | Add one line per book sold, storing title, supplier, and selling price. | TP1, F05-TP3, F06-TP1 | The sale header is valid. | The admin searches for books, adds them (allowing duplicates), and enters selling prices. | Each line persists the book reference, supplier snapshot, and validated selling price. |
| F08-TP3 | Persist Sale and Align UI Copy | Save the sale record and ensure the button label reads "Out of stock". | F08-TP1, F08-TP2 | All validations pass. | The admin submits the sale. | The sale document with header/lines is stored and every prior "Mark as Sold" button label is updated to "Out of stock" without changing inventory automatically. |

Notes:
- Enforce customer selection and valid sale dates before line items can be added.
- Line items must show running totals and copy supplier data when a book is chosen.
- Inventory should not auto-flip yet; only the label changes to "Out of stock" until future inventory rules are defined.

# Feature: Title-Based Sale Line Entry (F09)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F09-TP1 | Title Autocomplete Experience | Make the title picker feel clickable with card-style suggestions, keyboard nav, and selection feedback. | F08-TP2 | An admin is adding a sale line and catalog titles exist. | They type and move through the suggestion list. | Each option renders as a card with badges + caret, hover/focus + aria-selected highlight the active item, selecting a book shows a confirmation chip, fires a “Book selected” toast, moves focus to selling price, and no-match cases keep the line disabled with guidance. |
| F09-TP3 | Header CTA and Draft Flow Alignment | Rename the header CTA, keep Persist sale disabled, and sync the draft UX with the current selection. | F08-TP1, F09-TP1 | The sale header form is visible. | The admin selects customer/date, presses the CTA, or picks a book. | The primary CTA reads “Add books” beside a disabled Persist sale button plus helper text, unlocks only after both fields validate, quietly resets the form after success, and keeps #saleLineDraftLabel as “Add another book” while focus hops forward/back as lines are composed. |
| F09-TP4 | Customer Selection Feedback | Highlight the chosen customer row and mirror the state in the sale header summary pill. | F07-TP3, F08-TP1 | An admin is using the customer lookup list. | They click Select on a customer and the ID saves. | The row gains a filled background, the button becomes a “Selected” checkmark chip, and #saleHeaderCustomerSummary swaps to the customer’s name/WhatsApp/city with a “Change customer” text button. |
| F09-TP5 | Persistent Customer Selection | Keep the chosen customer locked in even if the lookup input is cleared, only changing when another customer is explicitly selected. | F09-TP4 | A customer has already been selected and the summary pill is populated. | They clear the search box or type a new query without selecting someone else. | The prior selection remains highlighted and in the summary until “Change customer” is used to pick a different one; optionally expose a clear-selection control. |
| F09-TP6 | Sale Panel Access and Visual Hierarchy | Add a primary Record sale entry point and restyle the sale panel with elevated inputs and sticky sections. | F08-TP1, F09-TP1 | The inventory header (search + actions) is visible. | The admin clicks the Record sale button. | The header action matches primary button styling, opens/scroll-focuses the sale modal, inputs use a raised token with outline/glow focus states, sticky headers separate header vs line forms, and concise empty-state hints clarify what totals/metadata will appear once books are added. |
| F09-TP7 | Clear Lookup After Selection | Auto-clear the customer search field/results once a customer is selected so focus can move forward. | F09-TP4, F09-TP5 | A customer has just been selected and confirmed. | The selection confirmation fires. | The autocomplete input clears, results collapse, focus advances (e.g., to sale date), and the selected customer remains locked until Change customer is used. |
| F09-TP8 | Selling Price Input Guardrails | Restrict the selling price field to numeric entry with instant validation feedback. | F08-TP2 | An admin is entering a selling price for a sale line. | They type characters or attempt to submit a non-numeric/negative value. | Only digits (plus one optional decimal) are accepted, invalid keystrokes are ignored, and inline validation explains the price must be positive before the line saves. |

Notes:
- Keep autocomplete lightweight (title-only string match) yet visually differentiate suggestions and announce counts for screen readers.
- “Add books” (aka “Start line items”) CTA + helper text must gate book entry until customer/date validate and reflect success via updated copy.
- Customer selection should always show the confirmed state in both the lookup row and the summary pill, persist even when the search field clears, automatically clear the lookup UI after selection, and offer a quick “Change customer” affordance.
- The Record sale button plus sale panel styling (raised inputs, sticky headers, empty states) must keep the workflow visible, accessible, and one tap away.
- Selling price fields must block non-numeric input, ignore invalid keystrokes, and surface accessible validation when the value isn’t a positive number.

# Feature: Inventory Search Experience (F10)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F10-TP1 | Header Search Filters Available Panel | Move the title/author search into the Available accordion header so list filtering happens in place with accessible feedback. | — | An authenticated admin is on admin.html and sees the Available summary row containing the Search by title or author field. | They type at least two characters into the header search or edit the query. | The Available accordion keeps its current open/closed state, filters in place, and announces the filtered results via aria-live messaging tied to the panel. |

Notes:
- Relocate the search input + label into the Available accordion summary row (e.g., `#availableSearchLabel`, `#availableSearchInput`) and associate them with the panel via `aria-controls`.
- Keep the short-query guard (<2 characters) scoped to this header search; no auto-open, auto-scroll, or debounce logic should fire.
- Surface an aria-live status element inside the Available panel (e.g., `#availableSearchStatus`) that announces filtered results without shifting focus or forcing scroll.

# Feature: Sale Line Item Removal (F11)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F11-TP1 | Expose Remove Controls Per Line | Surface an accessible remove affordance on every sale line row so admins can initiate deletion just like standard order tables. | F09-TP3 | The Record sale table already lists at least one book line and the sale header is ready. | An admin focuses, hovers, or activates the delete control for a specific line. | Each row keeps a visible trash icon + text button with an aria-label naming the book, consistent hit targets on desktop/mobile, and a confirm pattern (inline dialog or two-step button) before removal runs. |
| F11-TP2 | Remove Line and Recalculate Draft State | Delete confirmed lines from local state, recompute totals, and reset draft inputs immediately. | F11-TP1 | A sale draft contains one or more line items and the admin confirms a removal event. | The removal confirmation completes. | The line disappears, totals/amount text recompute, supplier/book summary clears when relevant, focus returns to the book input, and removing the last line resets the draft label while disabling Persist sale until another line is added. |
| F11-TP3 | Persist Clean Payload After Removals | Ensure Persist sale only sends the currently visible lines and blocks empty submissions. | F11-TP2, F08-TP3 | One or more lines were removed (possibly leaving zero) and the admin proceeds to Persist sale. | The Persist sale action runs validation and prepares the Firestore payload. | Only remaining lines serialize, removed entries never reach Firestore, Persist sale is disabled with guidance when the list is empty, and the success status mentions how many line items actually saved. |

Notes:
- Remove controls must stay keyboard-focusable, announce pending deletion, and remain disabled whenever the sale header is locked.
- Totals, draft labels, and focus flow should mirror the existing “Add another book” experience so admins can keep entering books without reloading the panel.
- Persist sale should treat zero-line drafts as invalid and log how many lines were removed vs saved for audit/status history.

# Feature: Book Bundle Management (F12)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F12-TP1 | Create Supplier-Scoped Bundles | Let admins lock a supplier, add ≥2 of that supplier’s books, and capture a rupee price that defaults to 25% off the combined book prices. | F05-TP3, F13-TP1 | The Create Bundle panel is open and supplier master already has entries. | Admin selects a supplier (locking the picker), adds at least two unique books via the supplier-scoped autocomplete, and keeps the price within 1..total. | Submit persists a Draft bundle containing supplier metadata, ordered bookIds/books, total/recommended/bundle rupee fields, and createdBy data; validation blocks duplicates and out-of-range prices. |
| F12-TP2 | Publish or Unpublish Bundles | Provide publish/unpublish controls while keeping bundle content immutable post-save. | F12-TP1 | A Draft or Published bundle is loaded in the status panel. | Admin clicks Publish/Unpublish and may try editing title or price fields. | Only the status toggles in Firestore and UI; immutable fields snap back with warnings so title/books/price never change after creation. |
| F12-TP3 | List Bundles + Search by Book | Surface a bundles list driven by book autocomplete selection plus supplier/status filters, with metadata and publish actions per row. | F12-TP1, F12-TP2 | Existing bundles are available and the admin opens the Existing Bundles panel. | Admin types into the bundle search autocomplete, selects a book suggestion (optionally narrows by supplier/status), or clears the selection. | The list shows only bundles containing the selected book ID (combined with any supplier/status filter), displays title/supplier/price/book-count/status with publish controls, and shows an empty state when no matches remain; clearing the selection restores the full list. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all F12 topics.
- Book search in F12-TP3 must reuse the shared autocomplete helper and hydrate legacy bundles missing embedded book metadata.

# Feature: Pricing Integrity (F13)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F13-TP1 | Require Book Price, MRP, and Purchase Price | Ensure Add Book treats Price, MRP, and Purchase price as mandatory numeric inputs before save. | TP1, F05-TP3 | An admin fills the Add Book form. | They attempt to submit without one or more price fields. | Inline validation blocks submission until all three values are present and valid; persisted books always carry the trio. |
| F13-TP2 | Bundle Price Must Be Entered | Prevent bundle creation unless bundle price input holds a rupee value within the allowed 1..sum range. | F12-TP1 | Admin locks a supplier, selects books, and reaches the bundle price step. | They leave the price blank or clear it after the recommendation. | Submit stays disabled, inline copy explains the requirement, and persisted bundle documents always include bundlePriceRupees. |

Notes:
- Update admin forms/tests to treat Price, MRP, and Purchase price as mandatory on creation/edit; surface clear error messaging.
- Bundle creator should never rely solely on the recommended value—admins must explicitly enter a price before Save, and Firestore payloads must include it.

# Feature: Task-Focused Admin Workspace (F14)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F14-TP1 | Add Book Default Landing | Make the Add Book flow the default page so admins can start the most common task immediately after sign-in. | — | An authenticated admin finishes signing in or lands on /admin with no section specified. | The workspace initializes or the page refreshes. | The Add Book page loads first with its menu tile active, and hash/URL routes resolve to the same default state. |
| F14-TP2 | Expandable Icon Menu Navigation | Turn the icon grid into an accessible nav hub by letting tiles expand to show summaries/sub-actions before routing. | — | A signed-in admin can see the icon-style menu. | They focus or click a tile. | The tile expands with description and CTA links, collapses peers, updates ARIA state, and selecting a CTA routes to that task page. |
| F14-TP3 | Dedicated Admin Task Pages | Split current accordion panels into separate pages so each workflow loads only its own content. | F14-TP2 | An admin activates a nav tile other than Add Book. | Navigation swaps or routes to the requested task. | Only that task’s panel renders with its own hero/actions, while the menu highlights the active tile and offers a quick return path. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all F14 topics.
- Keep keyboard focus/ARIA semantics aligned between the menu and routed pages.
- Lazy-load task-specific scripts/data to avoid the heavy single-page accordion load.

# Feature: Admin Entry Points Coverage (F15)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F15-TP1 | Unified Admin Nav Map | Render the admin nav from a single config so every major panel (Manage books, Bundles, Record sale, Book requests, Suppliers, Customers) has a visible entry tied to its panel id. | — | An authenticated admin loads /admin and sees the workspace shell. | The navigation bar initializes. | Buttons for each panel appear with consistent data-nav ids, aria-controls, and keyboard order so any workflow can be entered without scrolling. |
| F15-TP2 | Customer Master Entry (Mouse-First) | Add a Customers nav control so mouse users can open the Customer Master accordion straight from the menu. | F15-TP1 | The Customers nav button appears in the admin menu. | An admin clicks it. | The customer panel expands, the Customers tile shows aria-current while Manage clears it, and existing form data remains untouched. |
| F15-TP3 | Hash & Section Deep Links | Guarantee each nav target (manageBooks, bundles, recordSale, bookRequests, suppliers, customers) has canonical hash and ?section aliases for bookmarks. | F15-TP1 | An admin opens /admin with a fragment or section query referencing one of those panels. | Initialization resolves the landing destination. | The referenced panel opens, its nav button is active, and window.location.hash normalizes to the canonical alias. |
| F15-TP4 | Remove Nav Detail Summaries | Strip the descriptive detail sections/CTAs so the icon menu only shows nav buttons that route on click. | F15-TP1 | The nav currently renders `#navDetail-*` sections for each tile. | The nav renders after sign-in. | The detail sections are gone/hidden for every tile; only the main buttons remain, simplifying the layout. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all F15 topics.
- Document and test the alias map (#customers, #customer-master, etc.) so future panels can reuse the pattern.
# Feature: Manage Books Sub Navigation (F16)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F16-TP1 | Manage Sub Nav Shell | Render the Manage Books dropdown sub nav (Add/Available/Sold) with ARIA/hash wiring so each panel can be targeted independently. | F14-TP2, F15-TP1 | An admin signs in and Manage Books loads as the landing tile (#add-book). | The Manage Books view renders. | A `#manageSubNav` dropdown with Add/Available/Sold buttons appears, Add owns aria-current, and the other Manage panels remain hidden until chosen. |
| F16-TP2 | Add Tab Default State | Keep the Add workflow as the default Manage sub page and reset hashes/visibility whenever users return to Manage. | F16-TP1 | The admin either first loads /admin or returns to Manage after visiting another nav tile. | Manage activates or the Add tab is clicked. | Only the Add panel shows, Available/Sold stay hidden, Add has aria-current, and the hash normalizes to `#add-book`. |
| F16-TP3 | Available Tab Behavior | Show the Available inventory as its own Manage sub page while preserving filters/search text and deep-link routing. | F16-TP1 | The Manage sub nav is visible and Available already holds search/filter state. | The user selects Available or loads /admin#manage-books/available. | Available remains visible while Add/Sold hide, the hash stays `#manage-books/available`, and its inputs keep prior values even after switching tabs. |
| F16-TP4 | Sold Tab Behavior | Expose the Sold/out-of-stock list via the Manage sub nav with deep-link support and default reset rules. | F16-TP1 | The Manage sub nav is available. | The user selects Sold or opens /admin#manage-books/sold then later returns to Manage. | Only the Sold panel displays while selected, the hash stays `#manage-books/sold`, and re-entering Manage resets Add with hash `#add-book`. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all F16 topics.
- Sold/Available tabs reuse the same dropdown helpers introduced in TP1 and must preserve dropdown focus/aria semantics when toggling panels.

# Feature: Nav Sub Menu Parity (F17)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F17-TP1 | Bundles Sub Nav Parity | Rename the "Create bundles" tile to "Bundles" and attach a two-button dropdown (Create/Manage) that reuses the Manage Books helper, hashes, and aria wiring. | F16-TP1, F15-TP1 | The admin nav config hydrates with the Manage sub nav helper already available. | The Bundles tile becomes active (landing state or click). | The tile label reads Bundles, the shared dropdown renders Create/Manage buttons, Create owns aria-current by default, hashes flip between `#bundles/create` and `#bundles/manage`, and existing panels hook up without duplicate markup or JS. |
| F17-TP2 | Sale Sub Nav Shell | Rename "Record sale" to "Sale" and reuse the dropdown helper to add a sub nav container (Record option today) so future Sale workflows can plug in without new wiring. | F16-TP1, F15-TP1 | The nav renders after sign-in with the Manage helper registered. | The Sale tile activates or a user loads /admin#sale/record. | A Sale dropdown (matching Manage/Bundles styling) appears with Record selected, the Record sale panel is the only visible section, hashes normalize to `#sale/record`, and no duplicate handlers/styles are added. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom across F17 topics.
- Reuse the existing Manage Books dropdown helper and CSS; adding future Bundles/Sale tabs should be data-only updates, not new DOM scaffolding.


# Feature: Unified Pagination Framework (F18)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F18-TP1 | Pagination Contract and Data Model | Define a reusable pagination contract (inputs, outputs, metadata) that all list views can adopt. | — | A view needs to load Firestore-backed records in pages instead of all at once. | The view requests a page of results using the shared pagination helper/contract. | The helper accepts consistent parameters and returns normalized records plus paging metadata (hasNext, hasPrev, cursors) without exposing Firestore details. |
| F18-TP2 | Admin List Pagination Shell | Provide a standard pagination control strip for admin lists (Previous/Next, item range, disabled states). | F18-TP1 | An admin list view has more items than the default page size. | The admin uses pagination controls (Next/Previous or page size changes). | The control strip updates pagination via the shared contract, reflects loading/disabled states, and shows a consistent summary like “Items 21–40 of 132.” |
| F18-TP3 | Public Catalog Pagination Application | Apply the unified pagination framework to the public catalog listings. | F18-TP1 | A visitor browses the catalog and a category has more items than fit on one page. | They reach the end of the list and use the pagination affordance. | Additional books load via the shared contract, the visible slice is clear, and the pattern is consistent across all catalog tabs. |
| F18-TP4 | Pagination State and Deep Linking | Keep pagination state restorable via URL/hash so refresh and back/forward land on the same slice. | F18-TP1, F15-TP3 | A list view uses the shared pagination contract and the user has navigated across pages/filters. | They refresh, share a link, or use browser back/forward to return to the list. | The view restores the same (or nearest safe) page based on URL/hash, keeps controls in sync, and never shows a different page than implied by the URL. |
| F18-TP5 | Pagination Controller Abstraction | Wrap shared helpers in a reusable controller with a tiny API for any list view. | F18-TP1, F18-TP2, F18-TP3, F18-TP4 | An admin or public list wants pagination without re-implementing helpers and URL wiring. | The view instantiates the controller with a dataSource, defaults, and location sync settings. | The controller owns pagination state, exposes goNext/goPrev/loadMore/setFilters + UI state callbacks, and keeps the list and URL/back/forward behavior aligned. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom across F18 topics.
- Establishes a single pagination helper and UI pattern that admin and public views can plug into without duplicating Firestore or routing logic.

# Feature: Available Books Pagination Integration (F19)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F19-TP1 | Available Books Data Source | Create a pagination-aware dataSource for the Available list that queries Firestore with the current filters and cursor. | F16-TP3, F18-TP1, F18-TP5 | Manage Books > Available is active and the pagination controller initializes. | The controller requests a page with size/direction plus the active filter or search state. | The dataSource builds the Firestore query, enforces ordering, and returns normalized results with paging metadata while resetting to page 1 whenever filters change. |
| F19-TP2 | Available Books Pagination Shell | Mount the shared pagination shell inside the Available panel and wire it to controller methods. | F19-TP1, F18-TP2 | The Available list contains more items than a single page. | The controller emits UI state changes or the admin uses Previous/Next. | The shell shows consistent summary text, toggles disabled states, fires goPrev/goNext without double submissions, and stays accessible for keyboard users. |
| F19-TP3 | Available Books Pagination State Sync | Persist pagination + filter state for the Available list across reloads and navigation. | F19-TP2, F18-TP4 | The admin has paged through or filtered Available books. | They refresh, deep-link to Manage Books, or use browser history to return. | The controller restores the same (or nearest safe) page/filter combo, updates hashes/query params cleanly, and avoids stale cursors when filters change. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all F19 topics.
- Pagination params must compose cleanly with `#manage-books/available` so other Manage tabs continue to work as-is.


# Feature: Backlog (BACKLOG)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| BACKLOG-TP1 | Accessible Customers Entry | Restore keyboard/screen-reader parity for the Customers nav flow (focus + deep-link announcements). | F15-TP2 | A keyboard/assistive-tech user triggers the Customers nav or loads /admin#customers / ?section=customers. | Navigation switches to Customers. | Focus moves to the panel heading, ARIA state is announced, and hashes normalize to #customers without disturbing other panels. |

Notes:
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom.
- This backlog topic captures the deferred accessibility scope once mouse-first parity ships.

# Feature: Technical Debt (TECHDEBT)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| TECHDEBT-TP1 | Sync Admin Nav With Hash History | Keep nav state/panels aligned with window.location.hash when users use browser back/forward. | F15-TP3 | The admin already navigated across sections so history entries exist. | They press Back/Forward and the hash changes. | A listener reruns handleAdminNav so aria-current/panels match the hash (fixes bug “P1 Badge Keep admin nav in sync with hash history”). |

Notes:
- Track this as tech debt; ready to pick up when hash-history sync is prioritized.
