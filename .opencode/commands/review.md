---
description: Review implementation for spec compliance and security issues (read-only, no changes)
agent: plan
subtask: true
---

Read @specification.md, @AGENTS.md, @docs/cap-patterns.md, and @docs/fiori-patterns.md first.

Review the following for correctness and spec compliance: $ARGUMENTS

Check every item in this list:

**SECURITY (report as CRITICAL)**
- `AdminService` must have `@requires: 'admin'` — never `@requires: 'authenticated-user'` or similar
- `BrowseService` must have NO `@requires` annotation
- No auth logic in handler `.js` files — auth is CDS annotation only

**DATA EXPOSURE (report as CRITICAL)**
- `BrowseService.ContentItems` must filter `status = 'published' AND isDeleted = false`
- `BrowseService.LearningPaths` must filter `status = 'published' AND isDeleted = false`
- No Draft, Archived, or soft-deleted items may leak through BrowseService

**SOFT DELETE (report as HIGH)**
- `ContentItem.isDeleted` field exists and defaults to `false`
- DELETE action sets `isDeleted = true` using `UPDATE` — never uses `DELETE` CDS QL
- `AdminService.ContentItems` filters `where isDeleted = false`

**STATUS TRANSITIONS (report as HIGH)**
- Only `draft → published` and `published → archived` are valid
- Validated in a `before('UPDATE')` handler
- Invalid transitions return `req.error(400, ...)`

**CAP PATTERNS (report as MEDIUM)**
- No `console.log` — must use `cds.log()`
- No raw SQL or `db.run()` — must use CDS QL
- All handlers use `async/await`
- Errors use `req.error()` with correct HTTP status codes

**CDS DATA MODEL (report as MEDIUM)**
- All entities use `cuid` and `managed` aspects
- All non-key fields have `@title`
- Enums use `@assert.range`

**TESTS (report as MEDIUM)**
- Auth rejection tests present (unauthenticated → 401)
- Status transition edge cases covered
- Browse filtering verified (draft/archived not returned)

Output format:
```
CRITICAL:
  - file.ext:line — description

HIGH:
  - file.ext:line — description

MEDIUM:
  - file.ext:line — description

LOW:
  - file.ext:line — description
```

Do NOT make any file changes — report only.
