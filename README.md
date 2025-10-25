# Srikar’s Books — Lightweight Catalog (Firebase)

A zero‑checkout, WhatsApp‑first catalog for Fiction / Non‑Fiction / Children. Add and remove items instantly via a small admin panel. Hosting + DB are on Firebase’s generous free tier.

## What you get
- **Public catalog** at `/index.html` with tabs for the three categories, search, and WhatsApp button.
- **Admin panel** at `/admin.html` (email+password) to add, mark sold/available, and delete. Images stored in Firebase Storage.
- **No server to run**. All static files, Firestore for data, Storage for images.

## 1) Set up Firebase (one-time)
1. Go to the Firebase console → Create a project.
2. Add a **Web app** → copy the config into `scripts/config.js`.
3. **Firestore** → Create database (Production mode). No need to add any data yet.
4. **Authentication** → Sign-in method → enable *Email/Password* (and optionally Google).
5. **Storage** → Create default bucket.
6. Add your admin email(s) in `scripts/config.js` (`adminEmails`) **and** in `firestore.rules` and `storage.rules` (replace `you@example.com`).

## 2) Apply security rules
In the Firebase console:
- Firestore → Rules → paste `firestore.rules` and publish.
- Storage → Rules → paste `storage.rules` and publish.

## 3) Local preview & deploy (Hosting)
Install the CLI once:
```bash
npm i -g firebase-tools
firebase login
```
From this project folder:
```bash
firebase init hosting   # choose your project, public dir ".", single-page app: "No"
firebase deploy
```
Your site will be live at the shown Hosting URL. Map a custom domain later if you want.

## 4) Using the admin
- Open `/admin.html`, sign in with an **email in your allowlist**.
- Fill the form (cover image is required) → **Add book**.
- Use **Mark sold**, **Mark available**, or **Delete** to manage inventory.

> ⚠️ **Indexes**: The first time you use the site, Firestore may ask you to create a composite index for the catalog queries (status + category + createdAt). Follow the link shown in the error to auto-create it (one click).

## Notes
- The public catalog only shows docs with `status == "available"`. Sold books disappear instantly from the public view.
- Images are cached aggressively; if you change a cover, the filename changes so the CDN updates.
- To change the WhatsApp number, edit `settings.whatsappNumber` in `scripts/config.js` (e.g., `"919876543210"`).

## Costs
- Firebase Hosting, Firestore, Storage have generous free allowances suitable for a small catalog. If you later exceed them, you can move to the Blaze pay-as-you-go plan; for low traffic/sites this is typically a few dollars/month.

## Optional improvements
- CSV import tool for bulk adds.
- OG tags per item for nicer sharing.
- RSS/JSON feed endpoint for social posts.
- Simple sitemap.xml for SEO.
