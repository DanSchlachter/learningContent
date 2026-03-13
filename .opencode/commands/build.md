---
description: Run cds build and fix all compilation errors
agent: build
---

Compile the full CDS project and fix any errors:

!`npx cds build 2>&1`

For each error reported:
1. Locate the exact file and line number from the error message
2. Fix the root cause in the CDS source — do not add workarounds or suppress errors
3. Common root causes:
   - Service projection references an entity element that no longer exists in `db/schema.cds`
   - Missing `using` import in a service or annotation file
   - Wrong association target name (check actual entity name in schema)
   - `@assert.range` enum value doesn't match the type definition
   - Annotation references a field not in the service projection
   - Wrong path in `using` statement (check relative path depth)

After fixing all errors, re-run to confirm a clean build:

!`npx cds build 2>&1`

The output must end with `build succeeded` or show zero errors before this task is complete.
