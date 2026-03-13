# Learning Content Management — Project TODO

## Status Key
- [x] Done
- [-] In progress
- [ ] Pending

---

## Phase 1: Project Scaffold
- [x] Read and analyse specification
- [x] Create directory structure (`db/`, `srv/`, `app/admin/`, `app/browse/`)
- [x] `package.json` with CAP + SQLite dependencies and mocked auth users
- [x] **Commit**: `feat: initial project scaffold with package.json and TODO`

## Phase 2: Data Model
- [x] `db/schema.cds` — all domain entities
  - `Categories` (hierarchical, parent/child)
  - `Tags` (flat list)
  - `ContentItems` (with `ContentType` and `PublishStatus` enums, soft-delete)
  - `ContentItems_Tags` (join composition)
  - `LearningPaths` + `LearningPathItems` (ordered)
  - `AdminUsers`
- [x] **Commit**: `feat: data model, admin and browse CDS services with Node.js handlers`

## Phase 3: CDS Services
- [x] `srv/admin-service.cds` — full CRUD + bound/unbound actions, `@requires: 'Admin'`
  - `changeStatus`, `duplicate` (bound actions on ContentItems)
  - `bulkPublish`, `bulkArchive`, `bulkDelete`, `bulkRecategorize` (unbound)
  - Draft enabled on ContentItems and LearningPaths
- [x] `srv/browse-service.cds` — read-only, `@requires: 'any'`, where-filtered views
  - `searchContent` function (q, contentType, categoryId, tagId, fromDate, toDate)
- [x] `srv/admin-service.js` — Node.js handler for all actions
- [x] `srv/browse-service.js` — Node.js handler for searchContent
- [x] **Commit**: (included in Phase 2 commit above)

## Phase 4: Fiori Elements UI
- [x] `app/admin/fiori-service.cds` — annotations for AdminService
  - ContentItems: SelectionFields, LineItem, HeaderInfo, FieldGroups, Facets, draft
  - LearningPaths: list + object page, draft
  - Categories / Tags / AdminUsers: list + object pages
- [x] `app/admin/manifest.json` — UI5 app routing for all admin entities
- [x] `app/browse/fiori-service.cds` — annotations for BrowseService
  - ContentItems: browse list with external-link column, detail object page
  - LearningPaths: list + detail with ordered items sub-table
- [x] `app/browse/manifest.json` — UI5 app routing for browse entities
- [x] **Commit**: `feat: Fiori elements annotations and UI5 app manifests for admin and browse apps`

## Phase 5: Sample Data
- [x] `db/data/learning.content-Categories.csv` (8 rows, hierarchical)
- [x] `db/data/learning.content-Tags.csv` (10 rows)
- [x] `db/data/learning.content-ContentItems.csv` (10 rows, mix of types/statuses)
- [x] `db/data/learning.content-ContentItems_Tags.csv` (14 join rows)
- [x] `db/data/learning.content-LearningPaths.csv` (2 rows)
- [x] `db/data/learning.content-LearningPathItems.csv` (5 rows)
- [x] `db/data/learning.content-AdminUsers.csv` (2 rows)
- [x] Verified: `npx cds deploy --to sqlite` loads all data cleanly
- [x] **Commit**: `feat: seed data — categories, tags, content items, learning paths, and admin users`

## Phase 6: Testing & Bug Fixes

- [x] `changeStatus` bound action — tested, works
- [x] `duplicate` bound action — fixed bad `cds` destructure (`const { cds: { utils } }` → `cds.utils.uuid()`); tested, works
- [x] `bulkPublish` — tested, returns count of updated rows
- [x] `bulkArchive` — tested, returns count of updated rows
- [x] `bulkDelete` (soft delete) — tested: `isDeleted=true`, hidden from BrowseService, visible in AdminService
- [x] `bulkRecategorize` — tested, updates `category_ID` on all selected items
- [x] `searchContent` — fixed `tagId` filter: replaced raw SQL subquery referencing non-existent table name with CQL `exists tags[tag_ID = '...']` path predicate; all filter combos tested (q, contentType, categoryId, tagId)
- [x] **Commit**: `fix: remove bad cds destructure in duplicate action`
- [x] **Commit**: `fix: use CQL exists path predicate for tagId filter in searchContent`

## Phase 7: Jest Test Suite

- [x] Install `@cap-js/cds-test` + jest; configure `package.json` with test script, jest config, setupFiles
- [x] Add `test/setup.js` — sets `CDS_ENV=test` before tests run
- [x] Configure `[test]` CDS profile in `package.json` at the `cds` level with `:memory:` SQLite DB
- [x] `test/browse-service.test.js` — 20 tests, all passing:
  - Authentication (unauthenticated 401, viewer gets 200)
  - ContentItems read (published only, no draft/deleted, filter, orderby, expand)
  - LearningPaths (published only)
  - searchContent (q, contentType, categoryId, tagId)
- [x] `test/admin-service.test.js` — 38 tests, all passing:
  - Authentication (401, 403 for non-Admin, 200 for Admin)
  - ContentItems read (all statuses/deleted visible to admin, filter, orderby)
  - ContentItems create & soft-delete via bulkDelete
  - Categories / Tags CRUD
  - `changeStatus` bound action (draft→published→archived, invalid status 400)
  - `duplicate` bound action (creates draft copy, visible in admin, hidden from browse)
  - `bulkPublish`, `bulkArchive`, `bulkDelete`, `bulkRecategorize`
  - LearningPaths + AdminUsers read
- [x] **Total: 58 tests, all passing** (`npx jest --runInBand`)
- [x] **Key learnings recorded**:
  - `req.params[0]` is a plain UUID string for single-key entities (not `{ID: ...}`)
  - Must use `cds.services.db.run(SELECT.one.from('fully.qualified.EntityName'))` for direct DB reads in bound action handlers — global `SELECT.one(serviceEntity)` tries to query a non-existent `ServiceName_EntityName` table
  - `changeStatus` returns HTTP 200 with entity body (not 204) since it declares `returns ContentItems`
- [x] **Commit**: `test: add admin-service tests — 58 tests passing`

---

## How to Run

```sh
npm install
cds watch
```

- **Admin UI**: http://localhost:4004/admin/ (login: alice / alice — role: Admin)
- **Browse UI**: http://localhost:4004/browse/ (public, no login required)
- **OData (Admin)**: http://localhost:4004/odata/v4/admin/
- **OData (Browse)**: http://localhost:4004/odata/v4/browse/

## Mocked Users (development only)

| User  | Password | Role  |
|-------|----------|-------|
| alice | alice    | Admin |
| bob   | bob      | Admin |
| carol | carol    | (none — viewer only) |
