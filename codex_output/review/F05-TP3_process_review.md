# Process Review — F05-TP3 Attach Supplier on Book Creation

✅ **Tests:** All green (see `codex_output/reports/F05-TP3_green.txt`)
📊 **Feature Coverage:** 46.31 % lines / 40.93 % branches (`npx cross-env NODE_OPTIONS=--experimental-vm-modules jest --coverage --collectCoverageFrom=["scripts/admin/inventory.js","scripts/admin/main.js"] --coverageDirectory=codex_output/coverage_F05-TP3 --watchAll=false --bail=0`)
🧩 **Scope:** scripts/admin/inventory.js, scripts/admin/main.js
💡 **Notes:** Supplier dropdown wiring in `main.js` (lines 28–235) has zero tests and `inventory.js` still misses the stale-selection/validation block (118–168, 319–405), so coverage fails the 70 % / 50 % thresholds.

**Verdict:** NEEDS WORK
