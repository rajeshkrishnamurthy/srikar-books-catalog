# AGENTS.md (Pipeline-Integrated Layout — HTML + Vanilla JavaScript Edition)

---
## codex-spec

**Goal**
Define high-level **features** and decompose each into 2–5 independently shippable **topics**, each with a clear goal, dependencies, and concise Given/When/Then summaries.

**Context**
codex-spec operates before implementation. It transforms feature descriptions into structured topic data files consumed by codex-tdd and downstream agents.

**Tasks**
1. Accept multiple features at once — each feature is identified by a unique `featureId` (e.g. `F01`, `F02`, etc.).  
2. For each feature, generate 2–5 topic entries.  
3. Prefix each topic ID with the feature ID to ensure global uniqueness (`F01-TP1`, `F01-TP2`, etc.).  
4. Record concise Given/When/Then summaries for each topic.  
5. Avoid framework-specific details.  
6. Write all features and topics into a single JSON file (`codex_output/topics.json`) and an optional human-readable Markdown file (`codex_output/topics.md`).

**Output Format (JSON)**
`codex_output/topics.json`

```json
{
  "features": [
    {
      "featureId": "F01",
      "featureTitle": "Purchase Price Management",
      "description": "Enable admins to manage purchase price visibility and editing.",
      "topics": [
        {
          "id": "F01-TP1",
          "title": "Capture Purchase Price on Add",
          "area": "Admin / Catalog",
          "goal": "Allow admins to enter a purchase price when creating a book.",
          "environment": ".NET 8 + C# + xUnit",
          "notes": "Validation for non-numeric and negative values must fail gracefully."
        },
        {
          "id": "F01-TP2",
          "title": "Edit Stored Purchase Price",
          "area": "Admin / Catalog",
          "goal": "Allow admins to modify an existing purchase price.",
          "environment": ".NET 8 + C# + xUnit",
          "notes": "Editing must preserve existing audit data."
        }
      ]
    },
    {
      "featureId": "F02",
      "featureTitle": "Inventory Import Automation",
      "description": "Automate import of supplier price lists.",
      "topics": [
        {
          "id": "F02-TP1",
          "title": "Parse Supplier CSV",
          "area": "Inventory",
          "goal": "Extract purchase prices and SKUs from supplier CSV uploads.",
          "environment": ".NET 8 + C# + xUnit"
        }
      ]
    }
  ]
}

Output Format (Markdown)
codex_output/topics.md

# Feature: Purchase Price Management (F01)
| Topic ID | Title | Area | Goal |
|-----------|--------|------|------|
| F01-TP1 | Capture Purchase Price on Add | Admin / Catalog | Allow admins to enter a purchase price when creating a book. |
| F01-TP2 | Edit Stored Purchase Price | Admin / Catalog | Allow admins to modify an existing purchase price. |


# Feature: Inventory Import Automation (F02)
| Topic ID | Title | Area | Goal |
|-----------|--------|------|------|
| F02-TP1 | Parse Supplier CSV | Inventory | Extract purchase prices and SKUs from supplier CSV uploads. |

**Deliverables**
✅ codex_output/topics.json — array of features with globally unique topic IDs.
✅ codex_output/topics.md — readable Markdown table for every feature.
✅ Automatically displayed in the Codex output window for review after generation.
✅ Each downstream agent (codex-tdd, codex-dev, etc.) can now query by featureId + topicId safely.
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
Perform the final readiness check for a topic — confirm that all tests pass, coverage meets thresholds, and that **codex-code-review** has explicitly declared the topic **READY FOR MERGE**.

**Context**
Runs last in the pipeline, after both codex-dev and codex-code-review complete.
Consumes:

* `codex_output/specs/<TopicID>.json`
* `codex_output/reports/<TopicID>_green.txt`
* Coverage artifacts
* `codex_output/review/<TopicID>_code_review.md`

**Tasks**

1. Confirm `"status": "GREEN"` in `specs/<TopicID>.json`.
2. Parse test results from `codex_output/reports/<TopicID>_green.txt`.
3. Run topic-scoped coverage using **coverlet + ReportGenerator** (or Jest for JS projects):

   ```bash
   dotnet test /p:CollectCoverage=true /p:CoverletOutput=codex_output/coverage/ /p:CoverletOutputFormat=cobertura
   reportgenerator -reports:codex_output/coverage/coverage.cobertura.xml -targetdir:codex_output/coverage_report -reporttypes:HtmlSummary
   ```

   *(In JavaScript contexts, use the equivalent Jest command.)*
4. Check coverage thresholds (≥ 70 % lines, ≥ 50 % branches).
5. Read `codex_output/review/<TopicID>_code_review.md` and confirm it contains:

   ```
   **Verdict:** READY FOR MERGE
   ```
6. Aggregate all checks into a single summary verdict:

   * ✅ Tests GREEN
   * ✅ Coverage thresholds met
   * ✅ Code review sign-off confirmed
7. Append this information to both the Markdown report and `summary.json`.

**Output**
`codex_output/review/<TopicID>_process_review.md`

```markdown
# Process Review — <TopicID> <Title>

✅ **Tests:** All green (see `codex_output/reports/<TopicID>_green.txt`)  
📊 **Feature Coverage:** 82 % lines / 67 % branches  
🧩 **Scope:** src/Admin/CatalogService.cs  
💬 **Code Review:** codex-code-review verdict = READY FOR MERGE  
💡 **Notes:** Validation and persistence layers fully covered.

**Final Verdict:** READY TO MERGE
```

**Deliverables**

* ✅ Topic-scoped coverage verification.
* ✅ Consolidated final verdict (`READY TO MERGE` / `NEEDS WORK`).
* ✅ Machine-readable `codex_output/review/summary.json` with fields:

  ```json
  {
    "topicId": "<TopicID>",
    "testsGreen": true,
    "coverageLines": 82,
    "coverageBranches": 67,
    "codeReviewVerdict": "READY FOR MERGE",
    "finalVerdict": "READY TO MERGE"
  }
  ```
* ✅ Write or update `changedFiles` and `changeNotes` in `codex_output/specs/<TopicID>.json` for traceability.

**Summary of Improvements**

| Area                  | Before            | Now                                                                  |
| --------------------- | ----------------- | -------------------------------------------------------------------- |
| **Pipeline position** | After codex-dev   | Runs after both codex-dev **and** codex-code-review                  |
| **Code review check** | Not considered    | Explicitly validates “READY FOR MERGE” verdict                       |
| **Output clarity**    | Technical-only    | Combines test, coverage, and review status                           |
| **Final authority**   | codex-code-review | codex-process-review confirms and publishes the final merge decision |

---

## codex-code-review

**Goal**
Assess the maintainability and readability of code implemented for this topic. Suggest improvements without altering verified behavior.

**Context**
Runs after codex-process-review passes. Reads topic metadata, commit diffs, and affected `.js`/`.html` files.

**Tasks**

1. Inspect changed files listed in `codex_output/specs/<TopicID>.json`.
2. Read changedFiles and changeNotes from the spec JSON to determine the review scope. If branch context is available, cross-check with Git diff for completeness.
3. Review for:

   * Naming and readability
   * Duplication or deep nesting
   * Reusable abstractions
   * Semantic HTML and accessibility
4. Identify improvement opportunities and summarize strengths.

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

