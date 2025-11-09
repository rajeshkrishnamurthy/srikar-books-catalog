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
