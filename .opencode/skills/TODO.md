# Extended Skills

All 13 extended skills are complete. Each entry describes the skill name (= directory name), its trigger description, and the key topics covered.

## Completed

- [x] **`cds-queries-cqn`** — CQL/CQN query building and execution in Node.js and Java
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `UPSERT` fluent builder APIs
  - CQN JSON notation and `cds.ql` helpers (`SELECT.from`, `INSERT.into`, etc.)
  - Java: `Select`/`Insert`/`Update`/`Delete` builders, typed model interfaces, `service.run()`
  - Parameterized queries, batch execution, `byId`, `matching`, `byParams`
  - Deep reads (`$expand` equivalent via nested projections)
  - `cds.ql.clone()` for safe query mutation

- [x] **`cap-authentication`** — Configuring authentication strategies (JWT, XSUAA, IAS, mocked, dummy)
  - Auth strategy kinds: `jwt`, `xsuaa`, `ias`, `mocked`, `dummy`
  - `npm add @sap/xssec` prerequisite for JWT/XSUAA/IAS
  - `cds add xsuaa` / `cds add xsuaa --for production`
  - `xs-security.json` and `xs-app.json` basics
  - Node.js: `cds.requires.auth` configuration in `package.json`
  - Java: `application.yaml` mock user configuration, `@WithMockUser` in tests
  - XSUAA hybrid setup, IAS with XSUAA fallback
  - Accessing JWT token properties in Java (`XsuaaUserInfo`, `AuthenticationInfo`)

- [x] **`cap-odata-protocol`** — OData V4 protocol exposure and HTTP interaction
  - Default base path `/odata/v4/<ServiceName>`, overriding with `@path`
  - HTTP verb → CAP event mapping (GET/POST/PATCH/PUT/DELETE)
  - System query options: `$select`, `$filter`, `$expand`, `$orderby`, `$top`, `$skip`, `$count`
  - Calling actions (POST) and functions (GET) over HTTP
  - OData `$batch` requests; `batch_limit` / `maxRequests` configuration
  - Parameter aliases (`@p1`), query-option style function params
  - Pagination (`@odata.nextLink`, `$skiptoken`), `cds.query.limit`
  - `$expand` depth limits (`cds.query.restrictions.expand.maxLevels`)
  - Open types (`@open`), structured elements (`odata.flavor: x4`)

- [x] **`cap-messaging`** — Pub/sub messaging, events, and enterprise messaging
  - `srv.emit(event, data)` to publish events
  - `srv.on(event, handler)` to subscribe
  - Declaring events in CDS: `event OrderShipped { ... }`
  - Connecting to message brokers: SAP Event Mesh, Redis, file-based (local dev)
  - `cds.requires.messaging` configuration
  - CloudEvents format support
  - Transactional outbox pattern (`cds.outbox`)
  - `cds add enterprise-messaging` / `cds add redis-messaging`

- [x] **`cap-remote-services`** — Consuming external OData/REST services
  - `cds.connect.to('ServiceName')` and `await srv.run(query)`
  - Importing external service APIs: `cds import <edmx-or-wsdl>`
  - Projecting external entities into local service
  - `cds.requires.<name>.kind`: `odata`, `rest`, `odata-v2`
  - Destination-based connectivity (BTP Destination Service)
  - Mocking remote services locally for development
  - Resilience: error handling, timeouts

- [x] **`cap-hana`** — SAP HANA-specific CAP features
  - `cds add hana` to switch from SQLite to HANA
  - HANA-specific types: `hana.TINYINT`, `hana.CLOB`, etc.
  - Native HANA artifacts: `.hdbview`, `.hdbtablefunction` via `db/src/`
  - HANA sequences for key generation
  - Calculated fields / virtual elements on HANA
  - Deploying with `cds deploy --to hana` / HDI containers
  - Hybrid testing with `cds bind`

- [x] **`cap-localized-data`** — Multi-language data with the `localized` keyword
  - `localized String` → generates `_texts` table and `localized` view
  - `$user.locale` for automatic locale resolution
  - Reading localized data: fallback chain (`user locale → default locale → base`)
  - `cds.localize` and `cds.unfold` internals
  - Seeding translations via CSV (`Books_texts.csv`)
  - Exposing `texts` composition in services

- [x] **`cap-i18n`** — Internationalization of labels and messages
  - `_i18n/` folder layout, `.properties` file format
  - `{i18n>Key}` references in CDS annotations
  - Language fallback resolution order
  - `cds.i18n` API for runtime message lookup
  - Translating validation messages (e.g. `@assert.range.message: '{i18n>key}'`)
  - Tooling: `cds compile --to edmx` includes i18n bundles

- [x] **`cap-testing-nodejs`** — Testing CAP Node.js services
  - `cds.test()` / `cds.test.in(folder)` setup
  - Supertest-style HTTP assertions (`GET`, `POST`, `PATCH`, `DELETE`)
  - Mock users in tests (`{ auth: { username: 'alice', password: '' } }`)
  - `cds.test` with Jest or Mocha
  - Testing custom actions and functions
  - In-memory SQLite for fast isolated tests
  - `expect(...).to.be.rejectedWith(...)` for error cases

- [x] **`cap-testing-java`** — Testing CAP Java services
  - Spring Boot test setup (`@SpringBootTest`, `@AutoConfigureMockMvc`)
  - `MockMvc` for HTTP-level integration tests
  - `@WithMockUser` for authenticated test scenarios
  - Mock users defined in `application.yaml` (test profile)
  - Using `CdsRuntime` and `PersistenceService` in tests
  - Asserting HTTP status codes and response bodies
  - Resetting in-memory H2/SQLite state between tests

- [x] **`cap-multitenancy`** — Multi-tenant CAP applications
  - `cds add multitenancy` — MTX sidecar setup
  - Tenant lifecycle: subscribe, unsubscribe, upgrade
  - `@sap/cds-mtxs` sidecar configuration
  - Tenant isolation in handlers (`req.tenant`)
  - Mock tenants for local testing
  - HDI container per tenant on HANA

- [x] **`cap-extensibility`** — SaaS extensibility and feature toggles
  - `extend` keyword for adding fields/associations at model level
  - Extension allowlists (`@cds.persistence.skip`, `@cds.autoexposed`)
  - Feature toggles: `cds.features`, `[feature-flag]` profile blocks
  - `cds.ExtensionDeveloper` role for tenant-level extensions
  - `cds pull` / `cds push` for extension lifecycle
  - Feature-toggled entities and annotations

- [x] **`cap-project-setup`** — CAP project initialization and structure
  - `cds init <name>` — scaffold a new project
  - `cds add <facet>` — add hana, xsuaa, mta, helm, multitenancy, etc.
  - `cds watch` — live reload during development
  - `cds run` — start without live reload
  - Standard folder layout: `db/`, `srv/`, `app/`, `test/`
  - `package.json` `cds` block: profiles, `requires`, `features`
  - `.cdsrc.json` for shared CDS configuration
  - `cds compile`, `cds deploy`, `cds build`
