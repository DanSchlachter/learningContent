---
description: Implement a new feature end-to-end (data model → service → UI → tests)
agent: build
---

Read @specification.md and load skills before starting:
- Load skill `cds-data-model` if model changes are needed
- Load skill `cap-service-design` for service/handler work
- Load skill `fiori-elements-ui` for annotation work

Implement the following feature: $ARGUMENTS

Follow this sequence exactly and use subagents for each layer:

**Step 1 — Data Model** (delegate to `@data-model-designer` if entities need to change)
- Update `db/schema.cds` if new entities or fields are needed
- Run: `npx cds compile db/schema.cds --to json` to verify

**Step 2 — Services** (delegate to `@cap-expert`)
- Expose new entities/actions in `srv/admin-service.cds` and/or `srv/browse-service.cds`
- Implement business logic in `srv/<service>.js` handler
- Run: `npx cds compile srv/ --to json` to verify

**Step 3 — UI** (delegate to `@fiori-builder`)
- Add Fiori annotations in `app/admin/webapp/annotations.cds` (and/or browse)
- Run: `npx cds build` to verify no annotation errors

**Step 4 — Tests** (delegate to `@test-writer`)
- Write tests in `test/` covering happy path, edge cases, and auth rejection
- Run: `npm test` — all tests must pass

**Invariants — never violate:**
- Soft delete only: `isDeleted = true`, never `DELETE` on ContentItem
- Status transitions: `Draft → Published → Archived` only, validated in `before UPDATE`
- BrowseService must never expose Draft, Archived, or soft-deleted items
- Admin endpoints must have `@requires: 'admin'`
- No custom SAPUI5 JavaScript — annotations only
- `async/await` everywhere, `cds.error()` for errors, `cds.log()` for logging
