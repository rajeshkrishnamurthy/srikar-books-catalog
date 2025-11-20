# AGENTS.md — Role Contracts (HTML + Vanilla JavaScript + CSS)

This document defines stable role contracts and artifacts for a test‑driven workflow. It is designed for long‑term use in a plain HTML/Vanilla JavaScript/CSS codebase validated with Jest.

---

## 0) Scope and Operating Assumptions

* **Stack:** HTML, ES Modules, CSS.
* **Tests:** Jest; RED → GREEN discipline.
* **Selectors as Contracts:** `id` and `[data-test]` are stable public interfaces for tests and tools.
* **Accessibility:** Semantic HTML, keyboard support, ARIA where needed.
* **Pattern Registry:** Central catalog of reusable UI/behavior modules (e.g., pagination, filter bar).
* **No background work:** Each role completes within its own run.

---

## 1) Repository Conventions

```
/src/
  ui/
    patterns/               # Reusable UI/behavior modules (by patternId)
  helpers/                  # Generic utilities (behavior‑preserving)
/tests/
  spec/                     # Behavior-level specs (Jest)
  unit/                     # Unit tests (Jest)
  fixtures/                 # Static fixtures
codex_output/
  topics.json               # Topics + metadata
  topics.md
  patterns.json             # Pattern Registry (API/params/a11y/tests notes)
  patterns.md
  specs/
    <TopicID>.json          # Spec expansion + status + notes
  reports/
    <TopicID>_red.txt
    <TopicID>_green.txt
    <TopicID>_ux_apply.txt
  review/
    <TopicID>_code_review.md
    summary.json
```

**IDs and Naming**

* **PROJECT_ID**: repository folder name (e.g., `srikar-book-deals`).
* **Topic IDs**: `<PROJECT_ID>-<FeatureID>-<TopicID>` (e.g., `srikar-book-deals-F03-TP1`).
* **Spec IDs**: stable slugs derived from topic + short behavior title.
* **Pattern IDs**: uppercase snake or kebab (e.g., `PAGINATION`, `FILTER_BAR`).

**Commit Messages**

* `feat(<SpecId>): …`
* `fix(<SpecId>): …`
* `refactor(<area>): …`

---

## 2) Default Pipeline and Routing

**Feature Pipeline**

1. `codex-spec` → topics and pattern intents.
2. `codex-tdd` → tests RED + spec JSON.
3. `codex-dev` → implement to GREEN (minimal change).
4. `codex-refactor` → behavior‑preserving improvements (optional).
5. `codex-code-review` → maintainability + conformance review.

**Auxiliary Flows**

* `codex-fix` — restore GREEN on regressions.
* `codex-reuse` — extract/centralize shared behavior into versioned pattern modules and migrate adopters.
* `codex-ux-prompt` / `codex-ux-apply` — plan and apply UI‑only changes safely.

**Review Routing Matrix**

* `[refactor]` → `codex-refactor` (behavior‑preserving)
* `[reuse]` → `codex-reuse` (cross‑screen consolidation)
* `[dev-nit]` → `codex-dev` (trivial, local, same cycle)
* `[bug-risk]` → add spec via `codex-tdd`, then `codex-fix`/`codex-dev`
* `[ux-only]` → `codex-ux-apply` (HTML/CSS/ARIA/microcopy only)

Tags are authored by `codex-code-review`.

---

## 3) Role Contracts

Short answer: it will be seen as an example only if you make the **schema** and **tier model** the normative parts of the role and explicitly mark examples as non‑normative. Add the guardrails below and the role is fully general for pattern creation.

---

## Drop‑in patch for **codex-spec** (general, pattern‑agnostic)

Paste this block over your existing **codex-spec** section.

````md
## codex-spec

**Goal**
Define features as independently shippable topics and capture repeatable UI/behavior as **Patterns**. Produce unambiguous metadata: Topic Macros (per‑screen reuse) and a Pattern Registry with shapes, adapters, accessibility, and canonical test behaviors.

**Scope**
Planning only. No production or test code edits. **Examples are non‑normative**; the schema and tier model are the only normative parts.

**Inputs**
Product intent and feature descriptions.

**Outputs**
- `codex_output/topics.json`, `codex_output/topics.md`
- `codex_output/patterns.json`, `codex_output/patterns.md`

**Tier model (normative)**
Every pattern is exactly one of:
- **contract** — pure, side‑effect‑free helpers (normalization, formatting, rules).
- **controller** — state + I/O + lifecycle; consumes adapters; exposes a small API.
- **shell** — UI renderer; consumes a controller; defines required anchors/selectors.
- **aggregate** — composes multiple patterns (e.g., contract + controller + shell).

**Pattern schema (normative)**
Each registry entry MUST follow this shape (keys not used by a given tier may be omitted):

```json
{
  "patternId": "STRING_UNIQUE",
  "type": "contract | controller | shell | aggregate",
  "version": "1.0.0",
  "purpose": "Short, vendor-neutral description",
  "requiredParams": ["..."],
  "optionalParams": ["..."],
  "adapters": { "name": "signature string" },   // e.g., "fetch(data) => Promise<Result>"
  "uiTexts": { "key": "Default copy with {placeholders}" },
  "a11yNotes": ["..."],
  "testBehaviors": ["Canonical behavior checks for codex-tdd"],
  "docs": {
    "requestShape": { "field": "type/meaning" },
    "stateShape":   { "field": "type/meaning" },
    "mountApi":     "mount(container, { params, adapters, uiTexts, options }) => { destroy() }"
  },
  "composes": ["SUBPATTERN_IDS_IF_AGGREGATE"]
}
````

**General adapter style (normative)**

* Asynchronous work returns `Promise<NormalizedResult>`.
* Signatures are vendor‑neutral; any datastore specifics live **inside** adapters.
* Provide `onStateChange(state)` and `onError(error, state)` only for controller/aggregate tiers when needed.

**Tasks**

1. **Project scoping**

   * Derive `PROJECT_ID` from the repository root folder.
   * Topic IDs: `<PROJECT_ID>-<FeatureID>-<TopicID>`.

2. **Feature → Topic decomposition**

   * 2–5 topics per feature with concise **Given/When/Then** behavior.

3. **Pattern authoring**

   * Create/update registry entries using the schema above.
   * Prefer **aggregate** entries to simplify adoption (compose sub‑patterns as needed).

4. **Topic Macro (reuse) authoring**

   * For any topic adopting a pattern, add:

   ```json
   "reuse": {
     "patternId": "<PATTERN_ID>",
     "params":   { /* screen-specific params */ },
     "adapters": { /* screen-specific adapter entry points */ },
     "uiTexts":  { /* optional microcopy overrides */ }
   }
   ```

   * Use aggregate patterns by default; reference sub‑patterns only for advanced/atypical needs.

5. **Definition of Ready (DoR)**
   A pattern may be referenced by topics only if its registry entry includes:

   * `purpose`, `version`, `requiredParams`, `adapters`, `testBehaviors`.
   * `docs.requestShape` and `docs.stateShape` (controller/aggregate), `docs.mountApi` (shell).
   * Accessibility notes for interactive surfaces.
   * Clear defaults and clamping rules for any enumerated params/options.

**Rules**

* No edits outside `codex_output/topics.*` and `codex_output/patterns.*`.
* No test creation or modification.
* Avoid framework specifics; stay HTML/Vanilla JS/CSS agnostic.
* Treat examples in `patterns.md` as illustrative, not prescriptive.

**Deliverables**
✔ `codex_output/topics.(json|md)`
✔ `codex_output/patterns.(json|md)` (schema‑conformant)
✔ Topics that reference patterns via a single `reuse` macro

```

---

## Optional: add a one‑line “non‑normative examples” banner to your registry doc

In `codex_output/patterns.md`, insert at the top:

```

Note: Examples in this document are non‑normative. The Pattern schema and tier model in AGENTS.md are normative and must guide all future patterns. Do not import example‑specific fields into unrelated patterns unless explicitly added to the schema.

```
---

### B) codex-tdd

**Goal**
Expand a topic into concrete specs and generate compiling‑but‑failing Jest tests (RED).

**Inputs**
`codex_output/topics.json`, `codex_output/patterns.json` (optional reuse hints).

**Outputs**

* Test files under `/tests/`
* `codex_output/specs/<TopicID>.json` with `"status": "RED"`
* `codex_output/reports/<TopicID>_red.txt`

**Tasks**

1. Create 3–7 observable behavior specs per topic.
2. Materialize tests in `/tests/spec` and `/tests/unit`; optional integration in `/tests/spec/integration`.
3. Use Pattern Registry to add standard tests when `reuse.patternId` is present.
4. Ensure failures are assertion‑only; validate RED with `npm test -- --watchAll=false`.

**Rules**

* Do not modify production code or topics.

---

### C) codex-dev

**Goal**
Make all failing tests for the target topic pass (GREEN) with minimal production‑code changes. Pattern‑aware for consumption of existing modules.

**Inputs**

* Jest failing output
* `codex_output/specs/<TopicID>.json`
* Optionally `codex_output/review/<TopicID>_code_review.md` for items tagged `[dev-nit]`

**Outputs**

* Production code changes in `/src`
* `codex_output/specs/<TopicID>.json` (allowed fields)
* `codex_output/reports/<TopicID>_green.txt`

**Behavior**

1. `npm test -- --watchAll=false --bail=0`; enumerate failing tests.
2. Implement the smallest change set to pass.
3. If `reuse.patternId` exists, mount/use `src/ui/patterns/<patternId>/` via its factory and thin adapters.
4. Apply only trivial `[dev-nit]` suggestions if they are local and risk‑free within the same cycle.

**Rules**

* Do not weaken assertions or edit tests.
* No broad extractions or cross‑screen consolidation (that is `codex-reuse`).
* Allowed updates in `specs/<TopicID>.json`: `"status": "GREEN"`, `changedFiles`, `changeNotes`, `helpers`.

---

### D) codex-fix

**Goal**
Restore GREEN when previously passing tests regress.

**Inputs**

* Current failing Jest output
* Prior GREEN artifacts
* `codex_output/review/<TopicID>_code_review.md` items tagged `[bug-risk]` (if any)

**Outputs**

* Minimal patch to `/src`
* Updated `codex_output/specs/<TopicID>.json` (allowed fields)
* Fresh GREEN report

**Behavior**

1. Identify root cause.
2. Apply the smallest viable fix.
3. If the failure originates in a pattern, fix centrally and validate adopters.

**Rules**

* No feature expansion.
* No refactors beyond what is necessary to fix.
* No test edits.

---

### E) codex-refactor

**Goal**
Improve structure/readability and remove duplication **without changing behavior**. Primary owner of review‑driven non‑behavioral improvements.

**Inputs**

* GREEN state
* `codex_output/review/<TopicID>_code_review.md` (consume `[refactor]` items)
* `codex_output/review/summary.json` (if present)
* `changedFiles` and diffs

**Outputs**

* Code improvements under `/src` and `/src/helpers`
* Updated `codex_output/specs/<TopicID>.json` (`helpers`, `changeNotes`, `changedFiles`)
* GREEN preserved

**Behavior**

1. Parse review findings; select non‑behavioral items.
2. Extract small helpers; simplify DOM; remove dead code; token‑ize CSS; add non‑behavioral ARIA.
3. Keep selectors and public DOM contracts intact.
4. Defer cross‑screen consolidation to `codex-reuse`.

**Rules**

* Zero observable behavior change.
* No test edits.

---

### F) codex-reuse

**Goal**
Extract, centralize, and evolve shared UI/behavior into **versioned** pattern modules, and migrate call sites **without changing observable behavior**.

**Inputs**

* `codex_output/patterns.json`
* GREEN code with similar behavior across ≥3 call sites or explicit adoption topics
* `codex_output/review/<TopicID>_code_review.md` (consume `[reuse]` items)

**Outputs**

* `src/ui/patterns/<patternId>/index.js` (factory)
* `src/ui/patterns/<patternId>/styles.css` (themeable)
* Optional `README.md`
* Updated adopters wired to the module
* Pattern Registry version bump + migration notes
* `codex_output/reports/patterns/<patternId>_reuse_migration.md`

**Standard Module API**

```js
// src/ui/patterns/<patternId>/index.js
export function mount(container, { params = {}, adapters = {}, uiTexts = {}, options = {} } = {}) {
  // attach DOM, wire events, call adapters, manage teardown
  return { destroy() { /* cleanup */ } };
}
```

**Behavior**

1. Identify canonical implementation; extract into `/src/ui/patterns/<patternId>/`.
2. Define/confirm public API from the Pattern Registry; set `version` (semver).
3. Migrate adopters; preserve tests and selectors.
4. If breaking changes are needed, bump major version and supply migration plan.

**Rules**

* Keep suite GREEN; do not weaken tests.
* No feature additions during extraction.
* Do not modify topic acceptance criteria; coordinate any new tests with `codex-tdd`.

---

### G) codex-ux-prompt

**Goal**
Translate UI/UX goals into deterministic implementation instructions for `codex-dev` or `codex-ux-apply`, grounded in accessibility and design heuristics.

**Inputs**
Design intent (text, sketches), existing UI.

**Outputs**
A single, structured instruction block:

```
=== codex-dev Implementation Instructions (from codex-ux-prompt) ===
<files to touch>
<target selectors / do-not-change selectors>
<step-by-step DOM/CSS edits>
<microcopy>
<layout/spacing/typography rationale>
<accessibility (roles, names, focus order, aria-live)>
<impact: UI-only | test-sensitive>
```

**Rules**

* Planning only; no code or artifact edits.

---

### H) codex-ux-apply

**Goal**
Apply **UI‑only** changes (HTML/CSS, non‑behavioral attributes) exactly as specified by `codex-ux-prompt`, keeping tests GREEN.

**Inputs**

* Latest instruction block from `codex-ux-prompt` marked **UI‑only**
* Optionally review items tagged `[ux-only]`

**Outputs**

* HTML/CSS diffs (and harmless attribute tweaks)
* `codex_output/reports/<TopicID>_ux_apply.txt`
* GREEN preserved

**Behavior**

1. Apply CSS tokens, spacing, typography, colors, and ARIA attributes.
2. Allow non‑breaking HTML wrappers/containers.
3. Do not alter selectors listed as “do‑not‑change.”
4. Run tests to confirm GREEN.

**Rules**

* No JS logic changes (events, control flow, data fetch).
* No renaming/removing IDs or `[data-test]`.
* Defer risky items to `codex-dev`.

---

### I) codex-code-review

**Goal**
Assess maintainability and correctness of changed code, verify reuse/pattern conformance, and document actionable improvements.

**Inputs**
`changedFiles`, diffs, `codex_output/specs/<TopicID>.json`, `codex_output/patterns.json`, GREEN test results.

**Outputs**

* `codex_output/review/<TopicID>_code_review.md`
* Optional `codex_output/review/summary.json`

**Findings must be tagged for routing**

* `[refactor]` non‑behavioral improvements; no test updates required.
* `[reuse]` cross‑screen duplication/patternization.
* `[dev-nit]` trivial, local, safe to fold into current GREEN cycle.
* `[bug-risk]` likely defect; recommend adding spec in `codex-tdd`.
* `[ux-only]` HTML/CSS/ARIA/microcopy without behavior change.

**Rubric**

* Correctness & tests; selectors stable; no weakened assertions.
* Reuse & patterns; thin adapters; generic pattern modules.
* Readability & structure; pure helpers; DOM isolation.
* CSS quality; tokens; sensible specificity; responsive constraints.
* Accessibility; roles/labels; focus management; aria-live.
* Performance & safety; cleanup of listeners; defensive checks.
* Documentation; clear `changeNotes`, pattern version references.

**Rules**

* Read‑only role; no code/test/spec edits.

---

## 4) Quality Gates

* **RED → GREEN:** Only `codex-dev`/`codex-fix` transition tests to GREEN.
* **Selector Stability:** `id` and `[data-test]` are contracts; only `codex-dev`/`codex-reuse` may change them, and only with tests updated by `codex-tdd`.
* **Patterns Semver:** `codex-reuse` manages `version` and migration notes.
* **Accessibility:** Every interactive pattern must be keyboard reachable and screen‑reader friendly.

---

## 5) Commands

* Run all tests (non‑watch):
  `npm test -- --watchAll=false`
* Fail‑fast off for debugging:
  `npm test -- --watchAll=false --bail=0`

---

## 6) Artifact Field Contracts

**`codex_output/specs/<TopicID>.json`**
(writers: `codex-tdd`, `codex-dev`, `codex-fix`, `codex-refactor`)

```json
{
  "topicId": "<TopicID>",
  "status": "RED | GREEN",
  "specs": [{ "id": "<SpecId>", "title": "...", "given": "...", "when": "...", "then": "..." }],
  "changedFiles": ["..."],
  "helpers": ["src/helpers/..."],
  "changeNotes": "Concise behavior-focused notes"
}
```

**`codex_output/patterns.json`**
(writers: `codex-spec`, `codex-reuse`)

```json
{
  "patterns": [
    {
      "patternId": "PAGINATION",
      "version": "1.0.0",
      "purpose": "Paginate list/grid data with page-size selection.",
      "requiredParams": ["container", "defaultSize"],
      "optionalParams": ["pageSizes", "nextPrevLabels", "ariaLabels"],
      "adapters": { "getPage": "function(page,size)" },
      "uiTexts": { "emptyState": "", "loading": "" },
      "a11yNotes": ["Announce page changes via aria-live"],
      "testBehaviors": ["controls state", "page-size change", "adapter calls", "aria-live"]
    }
  ]
}
```

**End of AGENTS.md**

