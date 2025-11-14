# Code Review — F14-TP1 Add Book Default Landing

**Findings**
- No new issues detected. `ensureDefaultLanding` now resolves the incoming hash/query via `resolveLandingNavTarget` and only forces the Manage-books default when neither hint is present (`scripts/admin/main.js:693-771`). When admins arrive with `#book-requests` or `?section=suppliers`, the helper routes to the requested nav button and exits before collapsing other panels, so deep links work again while the default still covers hash-less arrivals.

**Verdict:** APPROVED
