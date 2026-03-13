---
name: cap-authorization
description: SAP CAP authorization - @requires, @restrict, instance-based filters, pseudo-roles, $user, mocked users for testing
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - "@requires for role guards"
    - "@restrict with grant/to/where"
    - instance-based authorization ($user, $user.<attr>)
    - pseudo-roles (authenticated-user, system-user, internal-user, any)
    - restriction inheritance and override
    - mocked users for local development
---

# CAP Authorization

## What This Skill Covers

Guide you in securing SAP CAP services and entities with declarative authorization, covering:

- `@requires` for coarse-grained role checks on services, entities, and actions
- `@restrict` for fine-grained grant/to/where rules
- Instance-based authorization with `$user` and `$user.<attr>`
- Pseudo-roles: `authenticated-user`, `system-user`, `internal-user`, `any`
- Restriction inheritance and overriding across service projections
- Mocked users for local development and testing
- Combining multiple restrictions (logical AND across levels)

## Rules

- ALWAYS check `cds-mcp_search_model` for existing service/entity annotations before adding authorization.
- ALWAYS verify annotation syntax with `cds-mcp_search_docs`.
- Put authorization annotations in `srv/` CDS files or in separate `annotate` files — not in `db/schema.cds`.
- Use `@requires` for simple role guards; use `@restrict` when you need per-entity CRUD control or instance filters.
- `@restrict` entries within a single entity are combined with OR; the service-level `@requires` is AND-combined with entity-level restrictions.
- The `where` clause in `@restrict` must reference element names that exist on the entity.
- Use `$user` to refer to the authenticated user's ID; use `$user.<attr>` for custom JWT attributes.
- The pseudo-role `any` explicitly allows unauthenticated (anonymous) access.
- Define mocked users in the `[development]` profile so they are never active in production.
- Actions/functions are best protected with `@requires`; `@restrict` on unbound functions has limited effect.

## Common Patterns

### Service-level guard
```cds
// All endpoints require authentication
service BrowseBooksService @(requires: 'authenticated-user') {
  @readonly entity Books as projection on db.Books;
}

// Only specific roles may enter
service AdminService @(requires: ['Admin', 'ContentManager']) {
  entity Books   as projection on db.Books;
  entity Authors as projection on db.Authors;
}
```

### Entity-level @restrict
```cds
service ShopService @(requires: 'authenticated-user') {

  // Role-based CRUD control
  entity Products @(restrict: [
    { grant: 'READ' },                          // any authenticated user may read
    { grant: 'WRITE', to: 'Vendor' },           // only Vendor may write
  ]) as projection on db.Products;

  // Instance-based: users only see their own orders
  entity Orders @(restrict: [
    { grant: '*', to: 'Customer', where: (CreatedBy = $user) }
  ]) as projection on db.Orders;

  // Combined: Auditor reads only records they audited
  entity AuditLog @(restrict: [
    { grant: 'READ', to: 'Auditor', where: (AuditBy = $user) }
  ]) as projection on db.AuditLog;
}
```

### Protecting actions and functions
```cds
service CatalogService {
  entity Products as projection on db.Products
    actions {
      @(requires: 'Admin')
      action addRating(stars: Integer);
    };

  @(requires: 'system-user')
  action replicateProducts();
}
```

### Allow anonymous access
```cds
service PublicService @(requires: 'any') {
  @readonly entity Books @(requires: 'any') as projection on db.Books;
  entity Reviews as projection on db.Reviews;       // requires auth
  entity Orders @(requires: 'Customer') as projection on db.Orders;
}
```

### Internal service (microservice-to-microservice)
```cds
@requires: 'internal-user'
service InternalDataService {
  entity SyncData as projection on db.SyncData;
}
```

### Restriction inheritance and override
```cds
namespace db;
entity Books @(restrict: [{ grant: 'READ', to: 'Buyer' }]) { /*...*/ }

service BuyerService @(requires: 'authenticated-user') {
  entity Books as projection on db.Books;   // inherits db-level @restrict
}

service AdminService @(requires: 'authenticated-user') {
  entity Books @(restrict: [
    { grant: '*', to: 'Admin' }             // overrides inherited restriction
  ]) as projection on db.Books;
}
```

### EXISTS predicate for association-based access
```cds
@restrict: [{
  grant: 'READ',
  where: 'exists teams.members[userId = $user and role = `Editor`]'
}]
entity Projects {
  teams : Association to many Teams;
}
```

### Mocked users for local development (package.json)
```json
{
  "cds": {
    "requires": {
      "auth": {
        "[development]": {
          "kind": "mocked",
          "users": {
            "alice": { "roles": ["Admin", "ContentManager"] },
            "bob":   { "roles": ["Customer"] },
            "carol": { "roles": ["Vendor"], "attr": { "region": "EMEA" } },
            "guest": {}
          }
        }
      }
    }
  }
}
```

Use mocked users in tests:
```js
await GET('/admin/Books', { auth: { username: 'alice', password: '' } })
await expect(GET('/admin/Books', { auth: { username: 'bob', password: '' } }))
  .to.be.rejectedWith(/403/)
```

## Pseudo-Roles Reference
| Pseudo-role | Meaning |
|---|---|
| `authenticated-user` | Any user with a valid token |
| `system-user` | Technical/service-to-service user |
| `internal-user` | Intra-application provider user |
| `any` | Anyone, including unauthenticated |

## Restriction Evaluation
Restrictions at multiple levels are combined with logical AND:
1. Service `@requires` must pass
2. Entity `@restrict` entries are evaluated (OR within entries)
3. Action-level `@requires` must pass

An entity with no `@restrict` and no `@requires` inherits from the service level.
