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
