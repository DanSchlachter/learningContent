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
