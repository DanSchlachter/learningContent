---
name: cap-project-setup
description: SAP CAP project scaffolding - cds init, cds add facets, Node.js vs Java, TypeScript, local dev with cds watch / mvn spring-boot:run, project layout
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - scaffold a new CAP project with cds init
    - add facets (sqlite, hana, xsuaa, approuter) using cds add
    - configure Node.js runtime with cds watch for local development
    - configure Java runtime with Maven and mvn spring-boot:run
    - enable TypeScript support in a CAP Node.js project
---

# CAP Project Setup & Scaffolding

## What This Skill Covers

This skill covers scaffolding and configuring new CAP projects for both Node.js and Java runtimes using `cds init` and `cds add`.

- Creating a new CAP project with `cds init` (Node.js and Java)
- Adding features/facets with `cds add`
- Standard project layout (`app/`, `srv/`, `db/`)
- Running locally: `cds watch` (Node.js) and `mvn spring-boot:run` (Java)
- TypeScript setup with CDS Typer
- Java Maven archetype and key `pom.xml` dependencies
- Key `.cdsrc.json` / `package.json` settings to know

## Rules

1. **Search docs before making any changes.**
   Always run `cds-mcp_search_docs` for project setup / CLI topics before writing commands or config. Run `cds-mcp_search_model` to inspect existing model definitions.

2. **Use `cds add` to add features — do not edit config files manually** for facets that have a dedicated `cds add <facet>` command.
   Examples: `cds add hana`, `cds add xsuaa`, `cds add typescript`, `cds add multitenancy`.

3. **After adding XSUAA (`cds add xsuaa`), regenerate `xs-security.json`** whenever authorization annotations change:
   ```shell
   cds compile --to xsuaa
   ```

4. **For new projects targeting HANA, disable native HANA associations** to speed up deploys:
    ```json
    // .cdsrc.json
    { "sql": { "native_hana_associations": false } }
    ```
    See the `cap-hana` skill for full details on HANA-specific configuration.

5. **Node.js TypeScript: use `cds-ts watch` / `cds-ts serve`**, not `cds watch` / `cds serve`, so TypeScript is compiled automatically.

6. **Java: run `mvn compile` before starting the app** to trigger CDS build and code generation so generated Java sources exist in `srv/src/gen/java`.

---

## Creating a New Project

### Node.js

```shell
# Basic Node.js project
cds init bookshop

# With runtime flag
cds init bookshop --nodejs

# With features added immediately (--nodejs required when adding sample content)
cds init bookshop --add sample,hana,xsuaa,typescript --nodejs

# Tiny sample (single-file service, great for rapid prototyping)
cds init bookshop && cd bookshop && cds add tiny-sample
```

### Java (Maven Archetype)

```shell
# Mac / Linux / WSL
mvn archetype:generate \
  -DarchetypeArtifactId=cds-services-archetype \
  -DarchetypeGroupId=com.sap.cds \
  -DarchetypeVersion=RELEASE

# Or via cds init (shortcut)
cds init bookshop --java
```

Key Maven archetype `-D` options:

| Option | Description |
|---|---|
| `-DgroupId=com.example` | Maven group ID |
| `-DartifactId=bookshop` | Maven artifact ID |
| `-Dpackage=com.example.bookshop` | Java base package |
| `-DincludeModel=true` | Include sample CDS model |
| `-DincludeIntegrationTest=true` | Include integration tests |
| `-DinMemoryDatabase=h2` | In-memory DB (`h2` or `sqlite`) |
| `-DjdkVersion=21` | Java version (17, 21, or 25) |
| `-DtargetPlatform=cloudfoundry` | Target platform |

---

## Standard Project Layout

```
bookshop/
├── app/          # UI content and Fiori annotations
├── srv/          # Service definitions (*.cds) and handlers (*.js / *.java)
├── db/           # Domain model (schema.cds) and CSV test data
├── .cdsrc.json   # CDS compile/runtime configuration (optional)
├── package.json  # Node.js: dependencies, cds config, scripts
└── readme.md
```

Java-specific additions:

```
bookshop/
├── srv/
│   ├── src/
│   │   ├── main/java/      # Java source
│   │   └── gen/java/       # Generated typed accessors (cds generate)
│   └── pom.xml
└── pom.xml                  # Parent POM
```

---

## Adding Features with `cds add`

```shell
# Production database
cds add hana          # SAP HANA Cloud (generates HDI artifacts)
cds add postgres      # PostgreSQL
cds add sqlite        # SQLite (default for dev; usually already present)

# Authentication
cds add xsuaa         # XSUAA / BTP authentication (generates xs-security.json)

# Deployment
cds add mta           # MTA descriptor (mta.yaml) for Cloud Foundry
cds add multitenancy  # MTX sidecar for SaaS multitenancy
cds add extensibility # Tenant extensibility via cds push/pull

# TypeScript
cds add typescript    # tsconfig.json, cds-typer integration

# HTTP test files
cds add http          # Generates .http request files for all services

# Other
cds add audit-logging # SAP Audit Log Service integration
cds add attachments   # SAP Object Store attachments support
cds add approuter     # SAP App Router configuration
cds add portal        # HTML5 Application Repository + managed App Router

# Combined (comma-separated, no spaces)
cds add hana,xsuaa,mta,multitenancy
```

Deploy to BTP Cloud Foundry:

```shell
cds add hana,xsuaa,portal,multitenancy,mta
```

Deploy to Kyma (Node.js):

```shell
cds init bookshop --nodejs --add sample && cd bookshop
cds add hana,xsuaa
```

---

## Running Locally

### Node.js

```shell
# Start with live reload (auto-restarts on file changes)
cds watch

# Start with a specific package in a monorepo
cds watch @capire/bookshop

# Watch with extra paths or exclusions
cds watch --include ../other-app --exclude .idea/

# Serve without watch (production-like)
cds serve all

# Serve generated artifacts
npx cds-serve -p gen/srv
```

Default local URL: `http://localhost:4004`

### Java

```shell
# Generate Java sources first (runs CDS compile + code generation)
mvn compile

# Start the Spring Boot app
mvn spring-boot:run

# Short form (if you add com.sap.cds to pluginGroups in ~/.m2/settings.xml)
mvn cds:watch
```

Add to `~/.m2/settings.xml` to use `cds:` plugin prefix:

```xml
<pluginGroups>
  <pluginGroup>com.sap.cds</pluginGroup>
</pluginGroups>
```

Default local URL: `http://localhost:8080`  
Mock user (unauthenticated local dev): `authenticated` (no password)

---

## TypeScript Setup (Node.js)

```shell
# Add TypeScript support
cds add typescript

# Install CDS type definitions
npm add -D @cap-js/cds-types

# Run with TypeScript compilation
cds-ts watch    # development
cds-ts serve    # production-like
```

CDS Typer generates typed model accessors into `@cds-models/`:

```shell
# Manual type generation
npx @cap-js/cds-typer "*"

# Automatic on cds watch startup (no manual step needed)
cds watch   # runs cds-typer once at startup
```

Import generated types in handlers:

```js
// srv/cat-service.js
const { Books } = require('#cds-models/sap/capire/bookshop')
```

Custom `tsconfig.cdsbuild.json` (optional, for custom output directory):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./gen/srv"
  },
  "exclude": ["app", "gen"]
}
```

---

## Java — Key Maven Dependencies (`srv/pom.xml`)

Minimal set for a Spring Boot + OData V4 CAP Java app:

```xml
<dependencies>
  <!-- Spring Boot web runtime -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <!-- Spring Boot JDBC (required for CAP database integration) -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
  </dependency>

  <!-- CAP Java: Spring Boot integration -->
  <dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-framework-spring-boot</artifactId>
    <scope>runtime</scope>
  </dependency>

  <!-- CAP Java: OData V4 adapter -->
  <dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-adapter-odata-v4</artifactId>
    <scope>runtime</scope>
  </dependency>

  <!-- CAP Java: API (compile-time) -->
  <dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-api</artifactId>
  </dependency>

  <!-- CAP Java: runtime implementation -->
  <dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-services-impl</artifactId>
    <scope>runtime</scope>
  </dependency>
</dependencies>
```

Or use the all-in-one starter:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-starter-spring-boot-odata</artifactId>
</dependency>
```

---

## Key Configuration Settings

### `.cdsrc.json` — project-wide CDS config

```json
{
  "sql": {
    "native_hana_associations": false
  },
  "requires": {
    "db": "sqlite"
  }
}
```

### `package.json` — Node.js CDS config (merged with `.cdsrc.json`)

```json
{
  "cds": {
    "requires": {
      "db": { "kind": "sqlite" },
      "auth": "mocked"
    },
    "[production]": {
      "requires": {
        "db": "hana",
        "auth": "xsuaa"
      }
    }
  }
}
```

### `application.yaml` — Java CDS config

```yaml
spring:
  datasource:
    url: "jdbc:sqlite::memory:"
    driver-class-name: org.sqlite.JDBC

cds:
  datasource:
    auto-config:
      enabled: false   # disable HANA auto-config for local dev

server:
  port: 8080
```

---

## Generating HTTP Request Files

```shell
cds add http
# Creates .http files for all services under http/
# Useful for testing with VS Code REST Client or JetBrains HTTP Client
```

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Running `cds watch` instead of `cds-ts watch` for TypeScript | Use `cds-ts watch` to auto-compile TypeScript |
| Java: "class not found" in IDE after init | Run `mvn compile` to generate typed accessors |
| Changing auth annotations without regenerating `xs-security.json` | Run `cds compile --to xsuaa` |
| Native HANA associations causing slow deploys | Set `"native_hana_associations": false` in `.cdsrc.json` |
| Forgetting `cds add mta` before CF deployment | Run `cds add mta` to generate `mta.yaml` |
| Spaces in `cds add` feature list | Use commas without spaces: `cds add hana,xsuaa` |
