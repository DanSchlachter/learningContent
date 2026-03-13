---
name: cap-extensibility
description: SAP CAP SaaS extensibility - tenant extensions with cds push/pull, ExtensionDeveloper role, extend keyword, extension project setup
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - enable tenant extensibility in a SaaS CAP provider app
    - develop extension projects with cds push and cds pull
    - use extend keyword and @assert.integrity to add fields and associations
    - configure ExtensionDeveloper role and extension allowlist
    - set up mtxs sidecar for extensibility support
---

# CAP SaaS Extensibility

## What This Skill Covers

This skill covers enabling tenant-specific extensibility in a CAP SaaS provider app and developing extension projects using `cds push`/`cds pull`.

- Enabling extensibility in a SaaS provider app
- Extension project layout and `package.json` configuration
- Pulling the base model with `cds pull` and pushing extensions with `cds push`
- The `cds.ExtensionDeveloper` role and mock user `bob`
- CDS `extend` syntax for entities, services, and annotations
- Extension lifecycle: local dev, test-drive, and production push
- Extension i18n and annotation overrides
- Build task type `mtx-extension`

## Rules

1. **Search docs before making any changes.**
   Always run `cds-mcp_search_docs` for extensibility topics before writing or modifying code. Run `cds-mcp_search_model` to inspect existing model or service definitions.

2. **Scaffold with `cds add extensibility`** (provider side).
   This sets `"extensibility": true` in `package.json` and adds `@sap/cds-mtxs`.

3. **Extension projects must declare `"extends": "<base-app-name>"`** in their `package.json`.
   The base app name must be a valid npm package name — it becomes the workspace name for `cds pull`.

4. **Never extend the same artifact twice in the same layer.**
   Merge multiple extensions for the same entity into one `extend` block to avoid unstable element ordering (`extend-repeated-intralayer` compiler error).

5. **Prefer `extend … with` for additive changes.**
   Adding elements, annotations, or associations is declarative and safe. Only fall back to custom handler logic when business logic cannot be expressed in CDS.

6. **`cds.ExtensionDeveloper` role is required for `cds pull` and `cds push`.**
   In local mock auth, use user `bob` (pre-configured with this role). In production, grant the role via XSUAA.

---

## Provider Side — Enabling Extensibility

```shell
# Add extensibility support to the provider app
cds add extensibility
```

This adds to `package.json`:

```json
{
  "cds": {
    "requires": {
      "multitenancy": true,
      "extensibility": true
    }
  }
}
```

Configure a test extension tenant and mock `bob` (ExtensionDeveloper) in `package.json`:

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[development]": {
          "kind": "mocked",
          "users": {
            "yves": { "roles": ["cds.Subscriber"] },
            "bob": {
              "tenant": "t1-ext",
              "roles": ["cds.ExtensionDeveloper"]
            },
            "carol": { "tenant": "t1" }
          }
        }
      }
    }
  }
}
```

---

## Provider Side — Extension Template Project

Create an extension project template for customers. The `package.json` must declare `"extends"`:

```jsonc
{
  "name": "@capire/orders-ext",
  "extends": "@capire/orders",      // base app package name — used by cds pull
  "workspaces": [ ".base" ]         // added automatically by cds pull if missing
}
```

Recommended extension project layout:

| File / Folder | Purpose |
|---|---|
| `app/` | All extension content (CDS models, UI) |
| `test/` | Extension test content |
| `package.json` | Project config with `"extends"` |
| `readme.md` | Getting-started guide |

---

## Customer (Extension Developer) Workflow

```shell
# 1. Subscribe tenant (mock: yves)
cds subscribe t1 --to http://localhost:4005 -u yves:

# 2. Subscribe test extension tenant
cds subscribe t1-ext --to http://localhost:4005 -u yves:

# 3. Open extension project template in VS Code
code ../orders-ext

# 4. Pull the latest base model (as bob, the ExtensionDeveloper)
cds pull --from http://localhost:4005 -u bob:
# Writes base model into .base/ and updates workspaces in package.json

# 5. Install workspace packages (links .base into node_modules)
npm install

# 6. Run extension locally
cds watch --port 4006

# 7. Push extension to test tenant (bob -> goes to t1-ext)
cds push --to http://localhost:4005 -u bob:

# 8. Push extension to production tenant (carol -> goes to t1)
cds push --to http://localhost:4005 -u carol:

# 9. Push a prepackaged archive
cds push path/to/extension.tgz
```

Override saved auth values when pushing:

```shell
cds push -s <otherSubdomain> -p <otherPasscode>
```

---

## CDS `extend` Syntax

### Add Fields to an Entity

```cds
// app/extension.cds
using { @capire.orders.Books } from '@capire/orders';

extend Books with {
  some_extension_field : String;
  internal_notes      : String @restrict: [{ grant: 'READ', to: 'InternalUser' }];
}
```

### Add an Association

```cds
extend Books with {
  supplier : Association to Suppliers;
}

// New entity only in the extension
entity Suppliers {
  key ID   : UUID;
      name : String;
}
```

### Override Annotations

```cds
extend Books with @(
  UI.LineItem: [
    { Value: title },
    { Value: some_extension_field }
  ]
);
```

### Extend a Service (add projection)

```cds
using { CatalogService } from '@capire/orders';

extend service CatalogService with {
  entity ExtBooks as projection on Books;
}
```

### Avoid `extend-repeated-intralayer` Error

```cds
// BAD: two separate extend blocks for same entity in the same layer
extend Books { foo: Integer; }
extend Books { bar: Integer; }  // ❌ unstable ordering

// GOOD: merge into one block
extend Books {
  foo : Integer;
  bar : Integer;
}
```

---

## Extension i18n

Place `i18n/i18n.properties` in the extension project root. Keys here override base app translations.

> Note: extension projects use `i18n/` (no underscore) at the project root, not `_i18n/`. The `_i18n/` convention (with underscore) is used for base app CDS source directories — see the `cap-i18n` skill for details.

```properties
# i18n/i18n.properties
Books.some_extension_field = My Custom Field
Books.internal_notes = Internal Notes
```

---

## Build Task Type `mtx-extension`

The `mtx-extension` build task generates `extension.tgz` for deployment via `cds push`.
It is automatically configured when `"cds": { "extends": "<base>" }` exists in `package.json`.

```shell
# Build the extension archive
cds build

# The resulting extension.tgz can then be pushed:
cds push gen/extension.tgz --to <url> -u <user>:
```

Extension point restrictions defined by the SaaS provider are validated during build. Build aborts if any restriction is violated.

---

## Production: Download Migrated Extension Projects

After migrating from legacy `@sap/cds-mtx` to `@sap/cds-mtxs`, download previously created extension projects:

```shell
cds extend <url> --download-migrated-projects
# Creates migrated_projects.tgz — requires cds.ExtensionDeveloper role
```

---

## Useful `cds.xt.ExtensibilityService` HTTP Endpoints

| Endpoint | Description |
|---|---|
| `GET /-/cds/extensibility/Extensions` | List active extensions for current tenant |
| `POST /-/cds/extensibility/activate` | Activate/push extension bundle to tenant |
| `DELETE /-/cds/extensibility/Extensions/<id>` | Remove an extension |

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| `"extends"` value is not a valid npm package name | Use `@scope/name` or simple `name` format |
| Repeated `extend` blocks for same entity in one file | Merge into a single `extend` block |
| Running `cds push` without pulling first | Always `cds pull` to get the latest base model |
| Missing `workspaces: [".base"]` in `package.json` | `cds pull` adds it automatically; add manually if missing |
| Extension build fails on restriction violations | Check `cds build` output for provider-defined extension points |
| `bob` has wrong tenant in mock config | Set `"tenant": "t1-ext"` under `bob` in mock auth users |
