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

## Phase 2: Data Model
- [ ] `db/schema.cds` — all domain entities
  - AdminUser, Category, Tag, ContentItem, ContentItem_Tags, LearningPath, LearningPathItem
- [ ] CSV seed data in `db/data/`

## Phase 3: CDS Services
- [ ] `srv/admin-service.cds` — full CRUD for Admin role
- [ ] `srv/browse-service.cds` — read-only public Browse service
- [ ] Authorization annotations (`@requires`, `@restrict`)

## Phase 4: Fiori Elements UI
- [ ] `app/admin/` — manifest, fiori-service.cds annotations
  - ContentItem list page + object page (draft)
  - LearningPath list + object page
  - Category / Tag management
- [ ] `app/browse/` — manifest, fiori-service.cds annotations
  - Home / browse list page
  - Content entry detail page

## Phase 5: Sample Data
- [ ] Categories CSV
- [ ] Tags CSV
- [ ] ContentItems CSV (mix of types and statuses)
- [ ] LearningPaths + LearningPathItems CSV

## Commits
- [ ] `feat: initial project scaffold`
- [ ] `feat: data model and CDS services`
- [ ] `feat: Fiori UI annotations and app manifests`
- [ ] `feat: sample seed data`
