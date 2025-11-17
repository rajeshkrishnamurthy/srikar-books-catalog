# AGENTS.md (Pipeline-Integrated Layout — HTML + Vanilla JavaScript Edition)

## codex-spec

**Goal**
Define high-level features and decompose each into 2–5 independently shippable topics with project-scoped globally unique topic IDs.

**Context**
codex-spec operates before implementation.
It transforms feature descriptions into structured topic files consumed by codex-tdd.

Each project contains its own AGENTS.md at the root, and codex-spec must treat the project’s root folder name as the PROJECT_ID.

For example:

catalog/AGENTS.md   → PROJECT_ID = catalog
sip/AGENTS.md       → PROJECT_ID = sip
ingestor/AGENTS.md  → PROJECT_ID = ingestor

**Tasks**
1. Derive PROJECT_ID automatically from the directory containing AGENTS.md (the repository root).
2. Convert to uppercase or leave as-is depending on your preference.
3. Accept multiple features at once — each feature identified by a featureId (F01, F02, etc.).
4. For each topic, generate a fully namespaced topic ID:
<PROJECT_ID>-<FeatureID>-<TopicID>
E.g.:
catalog-F08-TP1
sip-F05-TP3
ingestor-F11-TP2
This guarantees global uniqueness across all projects with no additional files.
5. Record concise Given/When/Then summaries for each topic.
6. Avoid framework-specific details.
7. Write all features + topics to:
codex_output/topics.json
codex_output/topics.md

**Role Exclusions — codex-spec must NOT:**
* Write or modify any files outside `codex_output/topics.json` and `codex_output/topics.md`.
* Modify or create test files.
* Modify or create production code.
* Update spec/green/review artifacts for any topic.

**Deliverables**
✔ codex_output/topics.json
✔ codex_output/topics.md
✔ Inline display of topics for human validation
✔ Perfect project scoping via folder-based PROJECT_ID
✔ No other artifacts modified
---

## codex-tdd

**Goal**
Expand a topic into concrete specs and generate compiling-but-failing **Jest tests (RED phase)**.

**Context**
codex-tdd reads from `codex_output/topics.json`, locates the chosen Topic ID, and outputs detailed spec metadata plus real test files.

**Tasks**

1. Load topic block from `codex_output/topics.json`.
2. Create 3–7 specs per topic describing observable behavior.
3. Generate test files:

   * `/tests/spec/<area>/{SpecId}_{Title}.spec.js`
   * `/tests/unit/<module>/{SpecId}_*.test.js`
   * Optional integration specs under `/tests/spec/integration/`
4. Create minimal fixtures under `/tests/fixtures`.
5. Ensure tests fail **only by assertion**.
6. Run RED validation with:

   ```bash
   npm test -- --watchAll=false
   ```
7. Write spec summary JSON for downstream agents.

**Role Exclusions — codex-tdd must NOT:**

* Modify production code (`src/` or top-level scripts).
* Modify helper modules or utilities.
* Modify `topics.json` except for reading.
* Create or update GREEN or REVIEW artifacts.
* Touch `codex_output/reports/<TopicID>_green.txt`, `code_review.md`, or any dev-phase files.

**Deliverables**
✔ Test files under `/tests/`
✔ `codex_output/specs/<TopicID>.json` (status: RED)
✔ RED validation report
✔ No prod code modifications

---

## codex-dev (HTML / Vanilla JavaScript Edition)

**Goal**
Automatically detect all failing **Jest** tests at the current repo state, make them pass with minimal production-code changes, then refactor safely while keeping everything **GREEN**.

**Context**
codex-dev follows codex-tdd. It uses Jest results as live input; no manual file hand-off required.

**Generic Failure-Handling Prompt**

* Only newly added tests should fail.
* Previously passing tests must remain green.

**Behavior**

1. Run `npm test -- --watchAll=false --bail=0`.
2. Parse failing test names.
3. Implement minimal changes to make those tests pass.
4. Iterate until fully green.
5. Mark `codex_output/specs/<TopicID>.json` `"status": "GREEN"`.

**Rules**

1. Do not weaken assertions.
2. Keep code pure; isolate DOM/Firestore side effects.
3. Small commits:

   * `feat(<SpecId>): minimal code to pass`
   * `refactor(<SpecId>): tidy without change`
4. No test-only branches.
5. Maintain semantic HTML and accessibility.
6. Perform refactoring immediately after GREEN.

**Refactor Awareness and Duplication Control**
(unchanged—already correct)

**Role Exclusions — codex-dev must NOT:**

* Create or modify test files (unit/spec/integration).
* Modify any `codex_output/topics.json` or `topics.md`.
* Modify any artifacts under `/tests/fixtures/` unless tests require additional builders (rare).
* Produce code review artifacts (`*_code_review.md`).
* Produce process-review artifacts (`*_process_review.md`).
* Change any `specs/<TopicID>.json` fields except:

  * `"status": "GREEN"`
  * `changedFiles`
  * `changeNotes`
  * `helpers` (if refactor extracted helpers)

**Deliverables**
✔ Production code updates
✔ `codex_output/specs/<TopicID>.json` updates (allowed fields only)
✔ `codex_output/reports/<TopicID>_green.txt`
✔ No test/spec/review artifacts modified

---

## codex-process-review

**Goal**
Final readiness check — confirm GREEN, coverage thresholds, and that **codex-code-review** declared **READY FOR MERGE**.

**Context**
Runs last, after codex-dev and codex-code-review.

**Tasks**

1. Confirm GREEN status.
2. Parse GREEN test logs.
3. Compute topic-scoped coverage.
4. Verify coverage thresholds.
5. Check for “READY FOR MERGE” in code-review output.
6. Produce final verdict.
7. Write summary artifacts.

**Role Exclusions — codex-process-review must NOT:**

* Modify production code.
* Modify test files.
* Modify any spec definitions except adding:

  * `finalVerdict` *(optional if you track it)*
* Modify helper modules or utilities.
* Modify topic list (`topics.json`, `topics.md`).
* Modify code-review artifacts except reading them.

**Deliverables**
✔ `codex_output/review/<TopicID>_process_review.md`
✔ Update to `codex_output/review/summary.json`
✔ No other file modifications

---

## codex-code-review

**Goal**
Assess maintainability/readability of code for this topic. Suggest improvements without altering verified behavior.

**Context**
Runs after codex-process-review inputs are ready. Reviews changed code only.

**Tasks**

1. Inspect changedFiles + changeNotes.
2. Review for naming, duplication, abstractions, wiring, HTML/DOM quality.
3. Produce review verdict.

**Role Exclusions — codex-code-review must NOT:**

* Modify production code.
* Modify test files.
* Modify `codex_output/specs/<TopicID>.json`.
* Modify `codex_output/topics.json` or `topics.md`.
* Modify process-review artifacts.
* Modify GREEN logs or coverage directories.

**Deliverables**
✔ `codex_output/review/<TopicID>_code_review.md`
✔ Optional update to `summary.json` (read-only for everything else)
✔ Absolutely no code or test modifications

---
# codex-ux

## Goal
Translate the user’s high-level UX intentions into a precise implementation prompt suitable for codex-dev, combining:
The user’s stated UI/UX goals, and
Best practices from Google Material Design (layout, spacing, grid, typography, interaction, affordances, hierarchy).
The output must be a crystal-clear instruction block that codex-dev can execute without ambiguity.

## Context
- codex-ux is NOT a coding agent.
- It never writes production code or test code itself.
- It is a UX translation layer that converts intent → instructions for codex-dev.
- codex-ux is invoked when UI needs improvements that do not require test changes.

### Examples:
- Button layout changes
- Form redesign
- Spacing + alignment
- Typography hierarchy
- Color + affordance improvements
- Component restructuring
- Microcopy improvements
- Navigation clarity

## Tasks
Read the user’s UX inputs describing desired UI improvements.
Interpret the intent based on:
	Material Design guidelines (layout grid, spacing, elevation, density, typography, component behavior)
	UX heuristics (clarity, hierarchy, visibility, accessibility)
Produce a codex-dev-ready request containing:
	The exact UI components to modify
	The desired new state
	A rationale framed in Material Design principles
	Step-by-step bullet points describing the required DOM/CSS/JS (UI only) changes
	Notes about which DOM IDs/classes must remain unchanged so tests continue passing
	Only output instructions, not code.
	Ensure instructions are fully actionable by codex-dev without needing extra clarification.
	Eliminate ambiguity — codex-dev must know exactly which files, which elements, and what UX change to implement.

## Output Format
codex-ux must output a final block titled:

=== codex-dev Implementation Instructions (from codex-ux) ===
<Specific step-by-step instructions>

*These instructions should include:*
Target files
Target DOM nodes
Necessary CSS class changes
Any new helper functions (UI-only)
Microcopy updates
Layout/spacing/grid rules
Accessibility improvements
Material Design reference rationale
Absolutely NO code should be produced — only structured guidance.

## Role Exclusions — codex-ux must NOT:
Modify any files
Write production code
Write test code
Produce JSON or topic artifacts
Modify AGENTS.md
Modify codex_output files
Execute codex-dev responsibilities
Generate refactors
Touch data logic, network calls, or app behavior
Change DOM element IDs or selectors used by tests (must warn the user if a change would break tests)

## Deliverables
✔ A clean, deterministic instruction block that codex-dev can directly act on
✔ Material-Design-backed explanation for each recommendation
✔ UX-first perspective that preserves existing test integrity
✔ Zero code generation
✔ Zero artifact modification

## Example Outputs
“Make the button layout follow Material 8dp spacing.”
“Increase visual hierarchy by applying a secondary typography style from Material guidelines.”
“Convert the supplier list into a card-based layout with 4px internal padding and 12px external spacing.”
“Rework the empty state using standard Material empty-state pattern: icon + headline + supporting text + primary action.”
---

### 📁 Standard Directory Layout

```
codex_output/
  topics.json
  specs/
    TP1.json
    TP2.json
  reports/
    TP1_red.txt
    TP1_green.txt
  review/
    TP1_report.md
    summary.json
tests/
  spec/
  unit/
  fixtures/
```

---

### ⚙️ Pipeline Order

1. `codex-spec` → writes `topics.json`.
2. `codex-tdd` → reads `topics.json`, writes `specs/<TopicID>.json` + tests.
3. `codex-dev` → auto-detects failing tests, updates `specs/<TopicID>.json` to GREEN.
4. `codex-review` → reads specs + reports, writes `review/<TopicID>_report.md`.

---

**End of AGENTS.md**
