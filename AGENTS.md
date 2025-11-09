# AGENTS.md (Pipeline-Integrated Layout — HTML + Vanilla JavaScript Edition)

---

## codex-spec

**Goal**
Define high-level **features** and decompose them into 2–5 independently shippable **topics**, each with a clear goal, dependencies, and concise Given/When/Then summaries.

**Context**
codex-spec operates before implementation. It transforms a feature description into structured topic data files consumed by codex-tdd.

**Tasks**

1. Identify minimal, independently deployable topics.
2. For each, record concise Given/When/Then summaries.
3. Avoid framework-specific details.
4. Write all topics to a machine-readable file for the next agent.

**Output Format (JSON)**
`codex_output/topics.json`

```json
{
  "feature": "<feature name>",
  "topics": [
    {
      "id": "TP1",
      "title": "Capture Purchase Price on Add",
      "area": "Admin / Catalog",
      "goal": "Allow admins to enter a purchase price when creating a book.",
      "environment": "HTML + Vanilla JavaScript + Jest + jsdom",
      "notes": "Validation for non-numeric and negative values must fail gracefully."
    }
  ]
}
```

**Deliverables**

* ✅ `codex_output/topics.json` — canonical list of topics for this feature.
* ✅ Human-readable Markdown copy (optional): `codex_output/topics.md`.
* ✅ No tests or code produced.
* ✅ After writing to codex_output/topics.json, also display the generated topics in the Codex output window in both table and markdown formats so the user can review them immediately.

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
4. Create minimal fixtures under `/tests/fixtures`.
5. Ensure tests fail **only by assertion**.
6. Run RED validation:

   ```bash
   npm test -- --watchAll=false
   ```
7. Write spec summary JSON for downstream agents.

**Output Files**

* `codex_output/specs/<TopicID>.json`

```json
{
  "topicId": "TP1",
  "specs": [
    { "id": "TP1-001", "title": "AddFormShowsPurchasePrice", "given": "...", "when": "...", "then": "..." }
  ],
  "fixtures": ["/tests/fixtures/bookBuilder.js"],
  "status": "RED"
}
```

**Deliverables**

* ✅ Jest test files placed in `/tests`.
* ✅ `codex_output/specs/<TopicID>.json` summarizing all specs.
* ✅ RED validation report appended to the JSON or logged to `codex_output/reports/<TopicID>_red.txt`.
* ✅ Ready hand-off to codex-dev and codex-review.

---

## codex-dev (HTML / Vanilla JavaScript Edition)

**Goal**
Automatically detect all failing **Jest** tests at the current repo state, make them pass with minimal production-code changes, then refactor safely while keeping everything **GREEN**.
Previously passing tests must remain green.

**Context**
codex-dev follows codex-tdd. It uses Jest results as live input; no manual file hand-off required.

**Generic Failure-Handling Prompt**

At any given time:

* Only newly added tests should fail.
* Previously passing tests must stay green.

**Behavior**

1. Run `npm test -- --watchAll=false --bail=0`.
2. Parse failing test names (lines beginning with “✕” or “FAIL”).
3. Implement minimal changes to make those tests pass, without breaking existing ones.
4. Iterate until the suite is fully green.
5. Update corresponding spec file `codex_output/specs/<TopicID>.json` → `"status": "GREEN"`.

**Rules**

1. Don’t weaken or remove assertions.
2. Keep code pure; isolate DOM/Firestore side effects.
3. Small commits only:

   * `feat(<SpecId>): minimal code to pass`
   * `refactor(<SpecId>): tidy without behavior change`
4. No test-only conditionals.
5. Maintain semantic HTML and accessibility.
6. After all tests pass, perform refactor with tests green.

**Deliverables**

* ✅ Implementation plan summarizing fixes.
* ✅ Key diffs (`.js` / `.html`).
* ✅ Updated `codex_output/specs/<TopicID>.json` → status GREEN.
* ✅ Proof (Jest summary) in `codex_output/reports/<TopicID>_green.txt`.

---
## codex-process-review

**Goal**
Verify TDD process compliance for the current topic — confirm that all tests pass, RED → GREEN flow was followed, and feature-scoped coverage meets thresholds.

**Context**
Runs after codex-dev marks the topic GREEN. Consumes `codex_output/specs/<TopicID>.json`, Jest results, and coverage artifacts.

**Tasks**

1. Confirm `"status": "GREEN"` in the spec JSON.
2. Parse Jest results from `codex_output/reports/<TopicID>_green.txt`.
3. Run coverage limited to files for this topic:

   ```bash
   npx jest --coverage --collectCoverageFrom="<topic files>"
   ```
4. Check coverage ≥ 70 % lines, 50 % branches.
5. Record per-topic coverage and verdict.

**Output**
`codex_output/review/<TopicID>_process_review.md`

```markdown
# Process Review — <TopicID> <Title>

✅ **Tests:** All green  
📊 **Feature Coverage:** 78 % lines / 61 % branches  
🧩 **Scope:** scripts/admin/inventory.js  
💡 **Notes:** Validation edge cases remain partially covered.  

**Verdict:** READY TO MERGE
```

**Deliverables**

* ✅ Topic-scoped coverage verification.
* ✅ Explicit verdict (`READY TO MERGE` / `NEEDS WORK`).
* ✅ Machine-readable summary in `codex_output/review/summary.json`.

---

## codex-code-review

**Goal**
Assess the maintainability and readability of code implemented for this topic. Suggest improvements without altering verified behavior.

**Context**
Runs after codex-process-review passes. Reads topic metadata, commit diffs, and affected `.js`/`.html` files.

**Tasks**

1. Inspect changed files listed in `codex_output/specs/<TopicID>.json`.
2. Review for:

   * Naming and readability
   * Duplication or deep nesting
   * Reusable abstractions
   * Semantic HTML and accessibility
3. Identify improvement opportunities and summarize strengths.

**Output**
`codex_output/review/<TopicID>_code_review.md`

```markdown
# Code Review — <TopicID> <Title>

**Strengths**  
- Validation logic is modular and easy to follow.  
- Follows semantic markup conventions.  

**Improvements**  
- Extract repeated numeric-validation block into helper.  
- Add JSDoc comments for exported functions.  

**Verdict:** CLEAN WITH MINOR IMPROVEMENTS
```

**Deliverables**

* ✅ Markdown report of qualitative findings.
* ✅ Optional scoring summary in `codex_output/review/summary.json`.

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

