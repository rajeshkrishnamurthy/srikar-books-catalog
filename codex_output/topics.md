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
| F07-TP3 | Customer Lookup for Sales | Provide searchable customer listings to other workflows (e.g., sales settlement). | F07-TP1 | Another workflow needs to assign a buyer. | The admin searches/filters/paginates through customers. | Matching customers are returned and the selected ID is emitted back to the calling flow. |

Notes:
- Deduplicate by name + WhatsApp and enforce consistent phone formatting.
- Editing should warn before clearing required data and keep immutable IDs for references.
- Lookup service must integrate cleanly with F06-TP3, exposing minimal fields for selection.

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
| F09-TP1 | Book Title Autocomplete | Let admins search catalog books for sale lines with lightweight title autocomplete. | F08-TP2 | An admin is adding a sale line and catalog titles exist. | They type a few letters into the Book title field. | Matching catalog titles appear, and selecting one locks the book ID without any SKU entry. |
| F09-TP2 | Auto-Fill Supplier and Price Context | Auto-populate supplier snapshots plus prior selling/purchase price hints once a title is chosen. | F09-TP1, F05-TP3, F06-TP1 | A book has been chosen via autocomplete and stores supplier/price history. | The admin confirms the selection. | Supplier info and the most recent selling/purchase price values prefill (still editable) so the admin can immediately enter the new selling price. |
| F09-TP3 | Draft Line Workflow and Focus Reset | Keep the inline draft row labeled "Add another book" until the header is valid, then reset and refocus after each line. | F08-TP1, F09-TP1 | The Add Sale experience is open with customer/date validation enforced. | The header is incomplete or a line saves successfully. | The draft row stays disabled until validation passes, and after each saved line it resets and returns focus to Book title for the next entry. |
| F09-TP4 | No-Match Error Handling | Block unmatched titles and guide admins to retype the canonical catalog title. | F09-TP1 | An admin enters a string with no catalog match. | The autocomplete finds zero matches or the admin tries to confirm the unknown title. | The line remains disabled, showing “No catalog match. Please retype the title exactly as listed.” until a valid title is picked. |
| F09-TP5 | Inventory Header Entry Point | Add a primary “Record sale” button beside the search box that launches the multi-book sale flow. | F08-TP1, F09-TP1 | An authenticated admin is on the Inventory view with the header actions visible. | They click the Record sale button. | A modal/section opens the sale workflow in-context, matching the header’s action styling and keeping focus within the new experience. |

Notes:
- Keep autocomplete lightweight (title-only string match) and fully keyboard accessible.
- Snapshot supplier/price data the moment a title is selected, but allow manual overrides.
- Inline draft row must respect header validation gates and always return focus to Book title for rapid entry.
- Unmatched titles should block progression and surface the provided guidance message.
- The header entry point must be high-visibility, keyboard accessible, and keep admins on the same page when launching the sale modal.
