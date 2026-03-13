# Learning Content Management — AI Agent Rules

This is a **SAP CAP (Node.js) + Fiori elements** application for a corporate Learning & Development
team. It lets admins curate external learning links and lets learners browse/search them publicly.

Full specification: @specification.md

---

## Project Structure

```
learningContent/
├── db/                    # CDS data model (.cds files)
├── srv/                   # CDS service definitions and Node.js handlers
│   ├── admin-service.cds  # Admin OData service (authenticated)
│   ├── browse-service.cds # Public viewer OData service (no auth)
│   └── *.js               # Service event handlers
├── app/
│   ├── admin/webapp/      # Fiori elements Admin app (List Report + Object Page)
│   └── browse/webapp/     # Fiori elements Browse/Viewer app
├── test/                  # Jest unit/integration tests
├── docs/                  # AI reference docs (patterns, conventions)
│   ├── cap-patterns.md    # CAP/CDS coding patterns — READ before writing CDS or handlers
│   └── fiori-patterns.md  # Fiori elements annotation patterns — READ before writing annotations
└── specification.md       # Full product specification — source of truth
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | SAP CAP Node.js (`@sap/cds`) |
| Database | SQLite (via CAP adapter, local only) |
| API | OData V4 (auto-exposed by CAP) |
| Frontend | SAP Fiori elements (metadata-driven, annotation-based) |
| Auth | CAP mock authentication (`cds.requires.auth = 'mocked'`) |
| Runtime | `cds watch` for local development |
| Tests | Jest (`@cap-js/cds-test` helper) |

---

## Core Coding Rules

### CDS Data Model (`db/`)

- Use `cuid` for all primary keys: `key ID : UUID`
- Use `managed` aspect for `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` (auto-filled by CAP)
- Define enums as CDS `type` with allowed values or use string with `@assert.range`
- Associations: use `Association to` for to-one, `Composition of many` for child collections
- Many-to-many: use an explicit join entity (e.g. `ContentItem_Tags`)
- Always annotate with `@title` for Fiori labels
- Soft delete: add `isDeleted: Boolean default false` and filter in the service projection

### CDS Services (`srv/`)

- **Two separate services**: `AdminService` (auth required) and `BrowseService` (public)
- `AdminService` exposes full CRUD; `BrowseService` exposes read-only projections filtered to `status = 'Published'`
- Protect `AdminService` with `@requires: 'admin'`
- Keep service files thin — put business logic in `.js` handlers, not inline
- Handler file naming: `admin-service.js` mirrors `admin-service.cds`
- Use `this.before`, `this.on`, `this.after` event hooks in handlers
- For actions/functions: define in CDS with `action`/`function` keyword, implement in handler
- Never bypass CAP's OData layer with raw SQL unless absolutely necessary

### Node.js Handlers (`srv/*.js`)

- Use `async/await` throughout; never use callbacks
- Use `cds.error()` for user-facing errors with HTTP status codes
- Access the database via `SELECT`, `INSERT`, `UPDATE`, `DELETE` from `cds.ql` (tagged template literals)
- Current user: `req.user.id`, roles: `req.user.is('admin')`
- Log with `cds.log()`, not `console.log`

### Fiori Elements Apps (`app/`)

- All UI is **annotation-driven** — do not write custom Fiori/SAPUI5 JavaScript unless impossible otherwise
- Admin app: `ListReport` + `ObjectPage` layout
- Browse app: `ListReport` (card-style) + `ObjectPage` for detail view
- Annotations live in `app/<appname>/webapp/annotations.cds` or inline in the service CDS
- Use `@UI.LineItem`, `@UI.FieldGroup`, `@UI.Facets`, `@UI.SelectionFields` for list/detail layouts
- Use `@Common.ValueList` for dropdowns (content type, status, category)
- Navigation between list and detail: handled by Fiori elements router, not custom code

### Authentication & Authorization

- Mock auth config in `package.json` under `cds.requires.auth`
- Admin user credentials defined in `package.json` under `cds.requires.auth.users`
- `BrowseService` has no `@requires` annotation — publicly accessible
- Always verify auth at the **service layer** via CDS annotations, not in handler code

### Tests (`test/`)

- Use `@cap-js/cds-test` to spin up the CAP server in-process
- One test file per service: `admin-service.test.js`, `browse-service.test.js`
- Test CRUD operations, status transitions, and authorization (unauthenticated requests must be rejected)
- Use `cds.test().in(__dirname + '/..')` to load the full project

---

## Key Data Entities

```
Category     — hierarchical (parent/child), slug
Tag          — flat list, slug
ContentItem  — type(video|article|course|file), title, url, summary, source,
               duration, status(draft|published|archived), category, tags,
               thumbnailUrl, isDeleted
LearningPath — title, description, coverImageUrl, status(draft|published),
               estimatedDuration; has ordered LearningPathItems
AdminUser    — email, name, status(active|inactive), lastLogin
```

---

## Behavioral Rules for AI

- **Always read `docs/cap-patterns.md` before writing any CDS or Node.js handler code.**
- **Always read `docs/fiori-patterns.md` before writing any Fiori annotations.**
- **Always read `specification.md` before adding new features** — it is the source of truth.
- When adding a new entity: (1) add to `db/schema.cds`, (2) expose in the relevant service `.cds`, (3) add Fiori annotations, (4) add a handler if business logic is needed, (5) add tests.
- When changing the data model: verify all service projections still compile (`cds build`).
- Prefer CAP built-in features (pagination, filtering, sorting, validation) over custom code.
- Soft delete: never `DELETE` a `ContentItem` from the DB — set `isDeleted = true`.
- Status transitions follow: `Draft → Published → Archived`. Validate in a `before UPDATE` handler.
- `BrowseService` must never expose `Draft` or `Archived` items to unauthenticated callers — enforce via `where status = 'Published'` in the service projection.

---

## Running the Project

```bash
cds watch          # Start local dev server with hot reload
cds build          # Compile CDS to check for errors
npm test           # Run Jest test suite
```

Admin UI:  http://localhost:4004/admin/
Browse UI: http://localhost:4004/browse/
OData API: http://localhost:4004/odata/v4/

Mock admin login — credentials defined in package.json cds.requires.auth.users.
