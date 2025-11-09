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

# Feature: Supplier Relationship Enhancements (F06)

| ID | Title | Goal | Dependencies | Given | When | Then |
|----|-------|------|--------------|-------|------|------|
| F06-TP1 | Multi-Supplier Selection on Book Add | Allow admins to associate one or more suppliers when creating a book, enforcing at least one selection. | F05-TP3 | An admin opens the Add Book form with suppliers already available. | They pick multiple suppliers (or attempt to submit with none) and submit. | The book stores a deduplicated supplier list and blocks submission when no supplier is chosen. |
| F06-TP2 | Edit Book Supplier Associations | Enable admins to add, reorder, or remove supplier links on existing books while keeping data valid. | F06-TP1 | A book already stores one or more supplier references. | An admin opens edit and adjusts the supplier list. | Updates persist atomically, enforce at least one supplier, and refresh admin views. |
| F06-TP3 | View Books Per Supplier | Add a \"View books\" action next to each supplier to list all related books. | F06-TP1 | The supplier list renders with Edit/Delete actions. | An admin clicks \"View books\" for a supplier. | A searchable list of linked books appears with empty-state messaging if none exist. |

Notes:
- Area: Admin / Catalog for F06-TP1/F06-TP2, Admin / Supplier Master for F06-TP3.
- Environment: HTML + Vanilla JavaScript + Firebase + Jest + jsdom for all F06 topics.
