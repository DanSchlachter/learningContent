---
description: Run all tests and fix every failure
agent: build
---

Run the full test suite:

!`npm test 2>&1`

For each failing test:
1. Read the test file to understand what the test expects
2. Identify the root cause in the IMPLEMENTATION (not the test) — only fix the test if it contains a genuine mistake
3. Fix the implementation in the relevant `srv/*.js` or `srv/*.cds` file
4. Re-run just the affected test file to confirm the fix:
   - Admin: `npx jest test/admin-service.test.js --no-coverage 2>&1`
   - Browse: `npx jest test/browse-service.test.js --no-coverage 2>&1`

After all individual fixes, run the full suite to confirm zero regressions:

!`npm test 2>&1`

All tests must pass before this task is complete. Do not skip or comment out tests.
