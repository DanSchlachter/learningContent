---
name: cap-multitenancy
description: SAP CAP multitenancy with MTX sidecar - tenant lifecycle (subscribe/upgrade/unsubscribe), cds.xt services, sidecar setup, Java & Node.js patterns
compatibility:
  runtime: ["nodejs", "java"]
metadata:
  tier: extended
  topics: ["multitenancy", "mtxs", "sidecar", "tenant-lifecycle", "saas"]
---

# CAP Multitenancy (MTX / `@sap/cds-mtxs`)

## What This Skill Covers
- Enabling multitenancy in Node.js and Java CAP projects
- MTX Sidecar architecture and service configuration
- Tenant lifecycle: subscribe, upgrade, unsubscribe
- Custom lifecycle event handlers (Node.js `server.js` and Java `@EventHandler`)
- Local test-drive: subscribing tenants, running sidecar + main app
- Tenant context switching in Java
- App Router and CF route setup

## Rules

1. **Search docs before making any changes.**
   Always run `cds-mcp_search_docs` for multitenancy / MTX topics before writing or modifying code. Run `cds-mcp_search_model` to inspect existing model definitions.

2. **Use `@sap/cds-mtxs` — NOT the legacy `@sap/cds-mtx`.**
   The new package is `@sap/cds-mtxs` (with an `s`). Required for cds v7+.

3. **Scaffold with `cds add multitenancy`.**
   This command generates the `mtx/sidecar/` subproject with correct `package.json` and profile. Do not create the sidecar manually.

4. **Do not add custom lifecycle handlers unless truly necessary.**
   The MTX sidecar handles DB provisioning automatically. Add handlers only for extra logic (notifications, custom provisioning parameters, etc.).

5. **For Java: use the sidecar URL approach.**
   The Java runtime connects to the Node.js MTX sidecar via `cds.multi-tenancy.sidecar.url` in `application.yaml`. There is no pure-Java sidecar.

6. **Tenant context switching in Java is expensive.**
   Avoid iterating over many tenants. Cache tenant lists if needed. Use `TenantProviderService.readTenants()` only when necessary.

---

## Enabling Multitenancy

### Node.js — `cds add multitenancy`

```shell
# Scaffold sidecar subproject and configure the main app
cds add multitenancy
# Also install sidecar into package-lock.json
npm i --package-lock-only mtx/sidecar
```

Generates `mtx/sidecar/package.json`:

```json
{
  "name": "bookshop-mtx",
  "dependencies": {
    "@cap-js/hana": "^2",
    "@sap/cds": "^9",
    "@sap/cds-mtxs": "^3",
    "@sap/xssec": "^4",
    "express": "^4"
  },
  "devDependencies": { "@cap-js/sqlite": "^2" },
  "engines": { "node": ">=20" },
  "scripts": { "start": "cds-serve" },
  "cds": { "profile": "mtx-sidecar" }
}
```

Main app `package.json` shortcut:

```json
{
  "cds": {
    "requires": {
      "multitenancy": true,
      "extensibility": true,
      "toggles": true
    }
  }
}
```

### Java — `application.yaml`

```yaml
cds:
  multi-tenancy:
    mtxs:
      enabled: true
    sidecar:
      url: http://localhost:4004   # or the deployed sidecar URL
```

---

## Sidecar Service Configuration

The `mtx-sidecar` profile enables these MTX services:

```jsonc
{
  "cds": {
    "requires": {
      "cds.xt.ModelProviderService": "in-sidecar",
      "cds.xt.DeploymentService": true,
      "cds.xt.SaasProvisioningService": true,
      "cds.xt.ExtensibilityService": true
    },
    "[development]": {
      "requires": { "auth": "mocked" },
      "server": { "port": 4005 }
    }
  }
}
```

Shared SQLite for local dev (in sidecar `package.json`):

```jsonc
{
  "cds": {
    "[development]": {
      "db": {
        "kind": "sqlite",
        "credentials": { "url": "../../db.sqlite" }
      }
    }
  }
}
```

---

## Running Locally (Test-Drive)

```shell
# Terminal 1: start the MTX sidecar
cds watch mtx/sidecar

# Terminal 2: start the main app
cds watch

# Subscribe a tenant (mock user yves = admin)
cds subscribe t1 --to http://localhost:4005 -u yves:

# Subscribe a second tenant for extension testing
cds subscribe t1-ext --to http://localhost:4005 -u yves:
```

---

## Tenant Lifecycle — Upgrade

After deploying a new app version, upgrade tenant DB schemas:

```shell
# CLI (run from project root, sidecar must be running)
cds upgrade t1 --at http://localhost:4005 -u yves:

# HTTP API
# POST http://localhost:4005/-/cds/deployment/upgrade
# Content-Type: application/json
# Authorization: Basic yves:
#
# { "tenant": "t1" }
```

Via REST to the sidecar provisioning endpoint:

```http
POST /-/cds/saas-provisioning/upgrade HTTP/1.1
Content-Type: application/json

{ "tenants": ["t1"] }
```

Programmatic upgrade (Node.js):

```js
const ds = await cds.connect.to('cds.xt.DeploymentService')
await ds.upgrade('t1')
```

CLI upgrade all tenants:

```shell
cd mtx/sidecar
cds-mtx upgrade *
```

---

## Custom Lifecycle Event Handlers

### Node.js — `mtx/sidecar/server.js`

```js
const cds = require('@sap/cds')

cds.on('served', () => {
  const { 'cds.xt.ModelProviderService': mps } = cds.services
  const { 'cds.xt.DeploymentService': ds } = cds.services

  // Run custom logic before upgrade
  ds.before('upgrade', (req) => {
    const { tenant } = req.data
    console.log(`Upgrading tenant: ${tenant}`)
  })

  // Run custom logic after subscription
  ds.after('subscribe', (_, req) => {
    const { tenant } = req.data
    // e.g. send notification email
  })

  // Inspect or mutate the CSN provided to tenants
  mps.after('getCsn', (csn) => {
    // remove or hide elements before serving model
  })
})
```

### Java — `@EventHandler` Component

```java
import org.springframework.stereotype.Component;
import com.sap.cds.services.mt.SubscribeEventContext;
import com.sap.cds.services.mt.UnsubscribeEventContext;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.Before;
import com.sap.cds.services.handler.annotations.After;
import com.sap.cds.services.handler.annotations.ServiceName;
import java.util.Collections;

@Component
@ServiceName("cds.xt.DeploymentService")
public class SubscriptionHandlers implements EventHandler {

  @Before
  public void beforeSubscription(SubscribeEventContext context) {
    // Inject HANA database_id when multiple instances exist
    context.getOptions().put("provisioningParameters",
        Collections.singletonMap("database_id", "<database ID>"));
  }

  @After
  public void afterSubscribe(SubscribeEventContext context) {
    String tenant = context.getTenant();
    // e.g. send provisioning notification
  }

  @Before
  public void beforeUnsubscribe(UnsubscribeEventContext context) {
    // Optionally keep resources for this tenant
    if (keepResources(context.getTenant())) {
      context.setCompleted(); // skip default deletion in @On phase
    }
  }

  @After
  public void afterUnsubscribe(UnsubscribeEventContext context) {
    // Notify offboarding finished
  }

  private boolean keepResources(String tenant) {
    return false;
  }
}
```

Upgrade handler:

```java
import com.sap.cds.services.mt.UpgradeEventContext;
import com.sap.cds.services.handler.annotations.On;

@On
public void onUpgrade(UpgradeEventContext context) {
  List<String> tenants = context.getTenants();
  Map<String, Object> options = context.getOptions();
  // custom pre/post migration logic
}
```

---

## Tenant Context Switching — Java

```java
import com.sap.cds.runtime.CdsRuntime;
import com.sap.cds.services.mt.TenantProviderService;
import com.sap.cds.services.mt.TenantInfo;
import org.springframework.beans.factory.annotation.Autowired;

@Autowired CdsRuntime runtime;
@Autowired TenantProviderService tenantProvider;

// Run as system user in the current (subscriber) tenant
runtime.requestContext().systemUser().run(ctx -> {
  // call technical service
});

// Run as system user of the provider tenant
runtime.requestContext().systemUserProvider().run(ctx -> {
  // call internal/provider-only services
});

// Run in a specific subscriber tenant
runtime.requestContext().systemUser("t1").run(ctx -> {
  return persistenceService.run(Select.from(Books_.class)).listOf(Books.class);
});

// List all subscriber tenants (EXPENSIVE — cache if used in loops)
List<TenantInfo> tenants = tenantProvider.readTenants();
```

---

## App Router Configuration

Forward internal CDS tool requests to the MTX Sidecar without App Router authentication (`xs-app.json`):

```json
{
  "routes": [
    {
      "source": "^/-/cds/.*",
      "destination": "mtx-api",
      "authenticationType": "none"
    }
  ]
}
```

---

## Useful MTX Service HTTP Endpoints

| Endpoint | Description |
|---|---|
| `GET /-/cds/saas-provisioning/tenant` | List all subscribed tenants and metadata |
| `GET /-/cds/saas-provisioning/tenant/<id>` | Get subscription metadata for one tenant |
| `POST /-/cds/saas-provisioning/upgrade` | Trigger DB schema upgrade for tenants |
| `POST /-/cds/deployment/upgrade` | Low-level upgrade (used by `cds upgrade` CLI) |
| `GET /-/cds/model-provider/csn` | Fetch combined CSN served to tenants |

---

## Mock Users for Local Testing

In `package.json` (Node.js), configure mock users with tenant assignment:

```json
{
  "cds": {
    "requires": {
      "auth": {
        "users": {
          "yves": { "roles": ["cds.Subscriber"] },
          "bob": { "tenant": "t1-ext", "roles": ["cds.ExtensionDeveloper"] },
          "carol": { "tenant": "t1" }
        }
      }
    }
  }
}
```

---

## `cds build` Task Types

| Type | Description |
|---|---|
| `mtx-sidecar` | MTX-enabled with sidecar (Node.js or Java) |
| `mtx` | MTX without sidecar (Node.js only, services in main app) |
| `mtx-extension` | Extension project build (`extension.tgz`) for `cds push` |

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Using `@sap/cds-mtx` (old package) | Use `@sap/cds-mtxs` for cds v7+ |
| Forgetting `npm i --package-lock-only mtx/sidecar` | Run after `cds add multitenancy` |
| Iterating all tenants in a hot code path | Cache `TenantProviderService.readTenants()` results |
| Mutating tenant context without `runtime.requestContext()` | Always use `requestContext()` API for tenant switching in Java |
| App Router blocking `/-/cds/` paths | Add `authenticationType: none` route for `^/-/cds/.*` |
