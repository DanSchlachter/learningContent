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

## Phase 8: Fiori UI — Serve Apps at localhost:4004

- [x] Add `app/browse/webapp/index.html` + `Component.js` — UI5 bootstrap via `sap/fe/core/AppComponent`
- [x] Add `app/admin/webapp/index.html` + `Component.js` — UI5 bootstrap via `sap/fe/core/AppComponent`
- [x] Add `app/index.html` — Fiori-styled `sap.m` tile launchpad replacing the generic CAP welcome page
  - Uses `sap.m.GenericTile` + `sap.m.Shell` (public CDN only — no `sap.ushell` dependency)
  - Links to `/browse/webapp/index.html` and `/admin/webapp/index.html`
  - CAP serves any `app/**/*.html` statically; `app/index.html` is the root index
- [x] Add `app/services.cds` — imports both `fiori-service.cds` files so annotations appear in `$metadata`
- [x] Fix all 13 failing admin tests caused by `@odata.draft.enabled` requiring `IsActiveEntity` key
  - Updated `key()` helper to `(ID=xxx,IsActiveEntity=true)` for active entity reads/actions
  - `POST /ContentItems` creates a draft — added `draftActivate` call in create tests before asserting on active entity set
- [x] **All 58 tests passing**
- [x] **Commit**: `feat: add browse app webapp with UI5 bootstrap index.html and Component.js`
- [x] **Commit**: `feat: add admin app webapp with UI5 bootstrap index.html and Component.js`
- [x] **Commit**: `feat: add app/index.html landing page replacing CAP welcome page`
- [x] **Commit**: `fix: use sap/ui/core/ComponentSupport pattern in webapp index.html files`
- [x] **Commit**: `fix: move manifest.json into webapp/ so Component.js can resolve it`
- [x] **Commit**: `fix: add app/services.cds to load fiori annotation files into CDS model`
- [x] **Commit**: `fix: replace broken FLP sandbox with sap.m GenericTile launchpad`
- [x] **Commit**: `fix: update admin tests for draft-enabled ContentItems (IsActiveEntity key)`

### Key notes
- `app/index.html` replaces the generic CAP welcome page — uses `sap.m.GenericTile` with public CDN (no `sap.ushell` needed)
- `sap/ushell/bootstrap/sandbox` is NOT available on the public CDN (`ui5.sap.com`) — returns 404
- `app/<name>/webapp/index.html` bootstraps UI5 from `https://ui5.sap.com/resources/sap-ui-core.js` (CDN)
- `data-sap-ui-resourceroots` maps the app namespace (e.g. `learning.content.browse`) to `./` so `Component.js` and `manifest.json` are found
- `Component.js` extends `sap/fe/core/AppComponent` with `manifest: "json"` — loads `manifest.json` from same directory
- `@odata.draft.enabled` changes OData key to `(ID=xxx,IsActiveEntity=true)` for active entities; POST creates a draft (IsActiveEntity=false) that requires `draftActivate` before it appears in the active entity set
- Browse app: `http://localhost:4004/browse/webapp/index.html` (public, no auth)
- Admin app: `http://localhost:4004/admin/webapp/index.html` (requires `alice`/`alice` or `bob`/`bob`)

---

## How to Run

```sh
npm install
cds watch
```

- **Landing page**: http://localhost:4004 (links to both apps)
- **Browse UI**: http://localhost:4004/browse/webapp/index.html (public)
- **Admin UI**: http://localhost:4004/admin/webapp/index.html (login: alice/alice or bob/bob)

## Mocked Users (development only)

| User  | Password | Role  |
|-------|----------|-------|
| alice | alice    | Admin |
| bob   | bob      | Admin |
| carol | carol    | (none — viewer only) |
