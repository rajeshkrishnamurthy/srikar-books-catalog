# AGENTS.md 

---

# 0) Scope and Operating Assumptions

* **Stack:** HTML, ES Modules, CSS.
* **Tests:** Jest; strict RED → GREEN discipline.
* **Selectors as Contracts:** `id` and `[data-test]` are stable public interfaces.
* **Accessibility:** Semantic HTML, keyboard support, ARIA where necessary.
* **Pattern Registry:** Central structured catalog of reusable UI/behavior modules.
* **No humans in the workflow:** All role-to-role transitions are machine only.
* **All inter-role handoffs use `.jsonl`.**
* **All global human-facing artifacts use `.md`.**
* **patterns.json** retained as the machine-friendly global registry.

---

# 1) Repository Conventions

```
/src/
  ui/
    patterns/               # Reusable UI/behavior modules (by patternId)
  helpers/                  # Generic utilities (behavior‑preserving)

/tests/
  spec/                     # Behavior-level tests (Jest)
  unit/                     # Unit tests (Jest)
  fixtures/

codex_output/
  topics.md                 # Human-facing feature decomposition
  patterns.md               # Human-facing Pattern Registry
  patterns.json             # Machine-facing Pattern Registry (structured)

  spec_inputs/              # From codex-spec → codex-tdd (.jsonl)
    <TopicID>.jsonl

  impl_inputs/              # From codex-tdd → codex-dev (.jsonl)
    <TopicID>.jsonl

  review/
    <TopicID>_code_review.md
    routing/<TopicID>.jsonl   # Machine-readable findings for routing

  specs/
    <TopicID>.json          # Expanded specs + status (RED/GREEN)

  reports/
    <TopicID>_red.txt
    <TopicID>_green.txt
    <TopicID>_ux_apply.txt
    patterns/<patternId>_reuse_migration.md
```

**Identifier Rules**

* **PROJECT_ID** = repository folder name.
* **Topic IDs:** `<PROJECT_ID>-<FeatureID>-<TopicID>`
* **Spec IDs:** derived from behavior titles.
* **Pattern IDs:** uppercase snake/kebab (e.g., `PAGINATION`).

---

# 2) Pipeline Overview

```
codex-spec
   ↓ (spec_inputs/*.jsonl)
codex-tdd
   ↓ (impl_inputs/*.jsonl)
codex-dev
   ↓
(optional codex-refactor / codex-reuse)
   ↓
codex-code-review
```

**Auxiliary flows:**

* `codex-fix` — restore GREEN
* `codex-refactor` — behavior-preserving improvements
* `codex-reuse` — pattern extraction + migration
* `codex-ux-prompt` / `codex-ux-apply`

**Routing Tags** (emitted by codex-code-review → `.jsonl`):

* `[bug-risk]` → codex-tdd → codex-fix
* `[dev-nit]` → codex-dev
* `[refactor]` → codex-refactor
* `[reuse]` → codex-reuse
* `[ux-only]` → codex-ux-apply

---

# 3) Role Contracts

## codex-spec

**Goal**
Define features as shippable topics and author Pattern Registry entries. Produce:

1. **Global human artifacts:** topics.md, patterns.md
2. **Global machine registry:** patterns.json
3. **Per-topic minimal packets:** spec_inputs/*.jsonl
4. **Wiring invariants** for codex-tdd to generate wiring tests.

---

### Inputs

Product/feature intent.

---

### Outputs

* `topics.md` (human)
* `patterns.md` (human)
* `patterns.json` (machine global registry)
* `spec_inputs/<TopicID>.jsonl` (machine packet)

---

### Pattern Tier Model (normative)

* **contract** — pure logic
* **controller** — state + lifecycle
* **shell** — DOM renderer/selectors
* **aggregate** — composed patterns

---

### Tasks

1. Derive PROJECT_ID and Topic IDs
2. Decompose features → topics
3. Extend Pattern Registry
4. Author reuse macros
5. Verify DoR (params, adapters, API, accessibility)
6. **Emit `.jsonl` Spec Input Packets**
7. **Emit Wiring Invariants** (new)

---

### `.jsonl` Spec Input Packet Format

Each record is a flat JSON object:

```
{"type":"meta","topicId":"...","title":"..."}
{"type":"given","text":"..."}
{"type":"when","text":"..."}
{"type":"then","text":"..."}
{"type":"reuse","patternId":"..."}
```

#### UI Anchors (DOM elements that must exist)

```
{"type":"ui-anchor","selector":"#nextBtn"}
```

#### JS Handlers (functions that must be wired to events)

```
{"type":"js-handler","event":"click","selector":"#nextBtn","handler":"goNextPage"}
```

#### Adapter Calls (required backend calls)

```
{"type":"adapter-call","function":"getPage","args":["page","size"]}
```

#### Pattern fragments

```
{"type":"pattern","patternId":"...","requiredParams":[...],"adapters":{...},"testBehaviors":[...]}
```

Rules:

* Only referenced patterns included.
* Wiring invariants MUST be included whenever UI interaction is implied.

---

### Rules

* Only modify topics.md, patterns.md, patterns.json, spec_inputs/*.jsonl
* No test or production code edits
* Wiring invariants MUST be included for UI events

---

## codex-tdd

**Goal**
Expand a topic into concrete specs and RED tests.
Ensure tests fully cover UI → JS → Adapter wiring.
Emit `.jsonl` Implementation Packet for codex-dev.

---

### Inputs

* `spec_inputs/<TopicID>.jsonl`
* Optional: patterns.json for validation

---

### Outputs

1. Tests under `/tests/spec/` and `/tests/unit/`
2. RED spec JSON: `specs/<TopicID>.json`
3. RED report: `reports/<TopicID>_red.txt`
4. **Implementation Packet:** `impl_inputs/<TopicID>.jsonl`

---

### Mandatory Test Coverage

codex-tdd MUST generate RED tests for all of the following (if applicable):

#### ✔ UI existence tests

```
expect($("#nextBtn")).not.toBeNull();
```

#### ✔ UI → JS wiring tests

```
click("#nextBtn");
expect(spy(goNextPage)).toHaveBeenCalled();
```

#### ✔ JS → Adapter wiring tests

```
goNextPage();
expect(getPage).toHaveBeenCalledWith(expectedPage, expectedSize);
```

#### ✔ Adapter → DOM update tests

```
await renderPage();
expect($("#pageNumber").textContent).toBe("2");
```

#### ✔ Pattern-level wiring tests

Validate adapters/params from patterns.json.

---

### Implementation Packet Format (`.jsonl`)

Each line is a flat JSON object:

```
{"type":"fail","test":"tests/spec/..."}
{"type":"spec","id":"...","given":"...","when":"...","then":"..."}
{"type":"ui-anchor","selector":"#nextBtn"}
{"type":"js-handler","event":"click","selector":"#nextBtn","handler":"goNextPage"}
{"type":"adapter-call","function":"getPage","args":["page","size"]}
{"type":"reuse","patternId":"..."}
{"type":"pattern","patternId":"...","requiredParams":["..."],"adapters":{"...":"..."}}
```

codex-dev uses this packet to implement full wiring.

---

### Tasks

1. Parse Spec Input Packet
2. Expand to 3–7 Given/When/Then specs
3. Generate RED tests
4. **Generate mandatory wiring tests**
5. Emit RED spec + Implementation Packet
6. Validate RED

---

### Rules

* No production code edits
* RED must represent full wiring failure
* Missing wiring MUST trigger test failures
* No weakening of pattern structural guarantees

---

## codex-dev

**Goal**
Turn RED → GREEN with minimal production code changes.

---

### Inputs

* `impl_inputs/<TopicID>.jsonl`
* Optional `[dev-nit]` findings
* Jest failure output

### Outputs

* Production code changes
* Updated `specs/<TopicID>.json` → GREEN
* `reports/<TopicID>_green.txt`

---

### Behavior

1. Load Implementation Packet
2. Confirm RED
3. Apply smallest code fix
4. Apply `[dev-nit]` if trivial and safe
5. Validate GREEN
6. Update spec JSON

---

### Rules

* Do not alter tests
* No weakened assertions
* No cross-screen consolidation (use codex-reuse)

---

## codex-fix

**Goal**
Restore GREEN after regressions.

**Inputs**

* Failing tests
* Prior GREEN spec
* Review routing `<TopicID>.jsonl` with `[bug-risk]`

**Outputs**

* Minimal fix
* Updated spec JSON
* GREEN report

**Rules**

* No feature expansion
* No test edits

---

## codex-refactor

**Goal**
Behavior-preserving improvements.

**Inputs**

* GREEN state
* Review routing `.jsonl` with `[refactor]`
* diffs

**Outputs**

* Improved code
* Updated spec JSON

**Rules**

* No behavioral changes
* No test edits

---

## codex-reuse

**Goal**
Extract shared behavior into versioned patterns.

**Inputs**

* patterns.json
* Review routing `.jsonl` with `[reuse]`

**Outputs**

* Pattern module under /src/ui/patterns
* Migration notes
* Pattern version bump

**Rules**

* Suite must remain GREEN
* No feature additions

---

## codex-ux-prompt

**Goal**
Translate UI/UX goals into deterministic instructions.

**Outputs**
Implementation instruction block (human-readable).

**Rules**

* Planning only

---

## codex-ux-apply

**Goal**
Apply safe UI-only changes.

**Inputs**

* Instruction block
* Review routing `.jsonl` with `[ux-only]`

**Outputs**

* HTML/CSS diffs
* UX apply report

**Rules**

* No JS behavior changes

---

## codex-code-review

**Goal**
Assess correctness/maintainability and produce routing instructions.

**Inputs**

* diffs, changedFiles
* patterns.json
* specs/<TopicID>.json

---

### Outputs

1. Human narrative: `review/<TopicID>_code_review.md`
2. Machine routing: `review/routing/<TopicID>.jsonl`
   Each line is one action:

```
{"type":"bug-risk","message":"..."}
{"type":"refactor","message":"..."}

```

