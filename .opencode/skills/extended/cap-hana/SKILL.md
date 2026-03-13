---
name: cap-hana
description: >
  SAP CAP HANA deployment — cds add hana, hdbtable vs hdbcds deploy format,
  cds deploy --to hana, native HANA associations, @cds.persistence.journal migration
  tables, HANA doc comments, cds.sql.native_hana_associations, keeping data on
  undeploy, localized String with @cds.collate.
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - cds add hana
    - @cap-js/hana
    - hdbtable / hdbcds deploy format
    - cds deploy --to hana
    - cds.sql.native_hana_associations: false
    - @cds.persistence.journal (migration tables)
    - HANA doc comments (/** */)
    - @cds.collate: false
    - keep existing data on undeploy
    - HDI container
    - Kyma / Kubernetes HANA deployment
---

# CAP SAP HANA Deployment

## What This Skill Covers

Deploying CAP applications to SAP HANA Cloud — configuring the project, choosing the
deploy artifact format, working with migration tables, native associations, and
preserving existing data.

## Rules

1. **Always** call `cds-mcp_search_docs` before writing or modifying HANA deployment configuration.
2. **Always** call `cds-mcp_search_model` before referencing entities or elements in deployment scripts.
3. Disable native HANA associations (`cds.sql.native_hana_associations: false`) by default for new projects — they increase deploy time without adding value for CAP.
4. Use `@cds.persistence.journal` only for entities that require zero-downtime schema migrations (migration tables).
5. Never put HDI credentials in committed config files — use service bindings.

---

## Project Setup

### Add HANA support

```shell
# Node.js
cds add hana
npm install

# Java — usually done at project init
cds init myapp --java --add hana
```

This adds `@cap-js/hana` (Node.js) or `cds-feature-hana` (Java) and sets `db.kind: hana`
in `package.json` / `application.yaml`.

### `package.json` after `cds add hana`

```json
{
  "cds": {
    "requires": {
      "db": {
        "kind": "hana-cloud"
      }
    }
  }
}
```

---

## Deploy Artifact Format

| Format | Artifacts | When to Use |
|---|---|---|
| `hdbtable` (default) | `.hdbtable`, `.hdbview` | All new projects — faster, HDI-native |
| `hdbcds` (legacy) | `.hdbcds` | Existing legacy projects only |

```json
{
  "cds": {
    "hana": {
      "deploy-format": "hdbtable"
    }
  }
}
```

Override to legacy:

```json
{
  "cds": {
    "requires": {
      "db": {
        "kind": "hana",
        "deploy-format": "hdbcds"
      }
    }
  }
}
```

---

## Deployment Commands

```shell
# Deploy to HANA (uses service binding from environment)
cds deploy --to hana

# Deploy to HANA on Kyma / Kubernetes
cds deploy --to hana:<binding-or-secret-name> --on k8s
# Omitting the name auto-creates a binding named <appName>-db-binding

# Build only (generate HDI artifacts without deploying)
cds build --for hana
```

---

## Native HANA Associations

Native HANA associations (`WITH ASSOCIATIONS`) increase deploy/revalidation time.
**Disable them** for faster deploys:

```json
{
  "cds": {
    "sql": {
      "native_hana_associations": false
    }
  }
}
```

Or in `.cdsrc.json` (Java):

```json
{ "sql": { "native_hana_associations": false } }
```

> Note: the first deploy after toggling this may be slower because existing tables/views
> are dropped and recreated.

---

## Migration Tables (`@cds.persistence.journal`)

Use `@cds.persistence.journal` for entities that must support **zero-downtime schema
migrations** (generates `.hdbmigrationtable` instead of `.hdbtable`):

```cds
@cds.persistence.journal
entity Books {
  key id    : Integer;
  title     : localized String;
  chapters  : Composition of many {
    key chapter : Integer;
    synopsis    : String;
  }
}
```

The annotation is inherited by compiler-generated entities (`Books.texts`,
`Books.chapters`). To opt out a generated entity:

```cds
annotate Books.chapters with @cds.persistence.journal: false;
```

---

## HANA Doc Comments

CDS `/** ... */` doc comments become `COMMENT` clauses on the generated HANA table:

```cds
/**
 * Central book catalog.
 */
entity Books {
  key ID    : UUID;
  title     : String(200);
  price     : Decimal(10, 2);
}
```

Generates:

```sql
CREATE TABLE Books (...) COMMENT 'Central book catalog.';
```

---

## Locale Collation Control

```cds
entity Books : cuid {
  title  : localized String(111);   -- locale-aware collation (default)
  descr  : localized String(1111);

  @cds.collate: false
  isbn   : String(40);              -- binary comparison, no locale collation
}
```

Use `@cds.collate: false` on elements that don't need locale-aware ordering to avoid
statement-wide locale collation overhead.

---

## Keeping Existing Data on Undeploy

When you remove a CSV/data file from the project but want to preserve existing data in HANA:

```json
{
  "cds.xt.DeploymentService": {
    "hdi": {
      "deploy": {
        "undeploy": [
          "src/gen/data/my.bookshop-Books.hdbtabledata"
        ],
        "path_parameter": {
          "src/gen/data/my.bookshop-Books.hdbtabledata:skip_data_deletion": "true"
        }
      }
    }
  }
}
```

---

## Java — `application.yaml`

```yaml
spring:
  datasource:
    url: "jdbc:sap://<host>:<port>?databaseName=<db>"
    username: "${HANA_USER}"
    password: "${HANA_PASSWORD}"
    driver-class-name: com.sap.db.jdbc.Driver

cds:
  datasource:
    auto-config:
      enabled: true
```

With service binding (recommended for BTP):

```yaml
spring:
  cloud:
    bindings:
      db-hana:
        metadata:
          type: hana
```

---

## Quick Reference

| Task | Command / Config |
|---|---|
| Add HANA | `cds add hana` |
| Deploy format | `"hana": { "deploy-format": "hdbtable" }` |
| Deploy | `cds deploy --to hana` |
| Disable native assoc. | `"sql": { "native_hana_associations": false }` |
| Migration table | `@cds.persistence.journal` on entity |
| Doc comment | `/** ... */` above entity/element |
| Disable locale collate | `@cds.collate: false` on element |
| Keep data on undeploy | `skip_data_deletion: true` in hdi.deploy.path_parameter |
