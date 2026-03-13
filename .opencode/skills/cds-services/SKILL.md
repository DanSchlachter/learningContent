---
name: cds-services
description: SAP CAP service definitions - projections, actions, functions, @readonly, @insertonly, @path, multi-protocol exposure
license: MIT
compatibility: opencode
metadata:
  topic: SAP CAP
  runtime: Node.js, Java
---

## What I do

Guide you in defining CDS services for SAP CAP applications, covering:

- Service definitions and entity projections/views
- Flattening and renaming fields in projections
- Bound and unbound actions and functions
- `@readonly`, `@insertonly` annotations
- `@path` and `@protocol` for endpoint control
- Exposing multiple services from one CDS file
- Auto-exposure of associated entities
- Separating domain model from service interface (service as facade)

## Rules

- ALWAYS search for existing service definitions with `cds-mcp_search_model` before making changes.
- ALWAYS check `cds-mcp_search_docs` before adding new service features or annotations.
- Keep service files in `srv/`; import domain models from `db/schema.cds` via `using`.
- Services should be use-case-oriented facades over domain models — avoid exposing the domain model directly.
- Prefer `as projection on` over `as select from` for simple exposures; use `as select from` only when you need SQL-style expressions.
- Do not define domain entities inside service files.
- Use `@readonly` on entities that should never be mutated via the service.
- Use `@insertonly` on entities where only INSERT is allowed (e.g., log entities).
- Keep `srv/` files clean of UI annotations; put those in `app/<fiori-app>/fiori-service.cds`.
- Unbound actions/functions are declared at service level; bound ones inside an entity's `actions { }` block.

## Common Patterns

### Basic service with projections
```cds
using { sap.capire.bookshop as db } from '../db/schema';

service CatalogService {
  @readonly entity ListOfBooks as projection on db.Books {
    ID, title,
    author.name as author,   // flatten association
    genre.name  as genre
  }

  @readonly entity Authors as projection on db.Authors;
}
```

### Admin service with full CRUD
```cds
using { sap.capire.bookshop as db } from '../db/schema';

service AdminService {
  entity Books   as projection on db.Books;
  entity Authors as projection on db.Authors;
  entity Orders  as projection on db.Orders;
}
```

### Unbound action and function
```cds
service OrderService {
  entity Orders as projection on db.Orders;

  // unbound action (modifies state, no return required)
  action  submitOrder(book: UUID, quantity: Integer);

  // unbound function (read-only, returns value)
  function getStockLevel(book: UUID) returns Integer;
}
```

### Bound action on entity
```cds
service TravelService {
  entity Travel as projection on db.Travel
    actions {
      action  acceptTravel();
      action  rejectTravel();
      function isValid() returns Boolean;
    };
}
```

### Controlling endpoint path and protocol
```cds
@path: 'browse'
service CatalogService {}
// exposed at: /odata/v4/browse

@protocol: ['odata', 'rest']
service CatalogService {}
// exposed at both /odata/v4/catalog and /rest/catalog

@protocol: 'none'
service InternalService {}
// not exposed externally, in-process only
```

### Virtual elements in projections
```cds
entity BookView as projection on db.Books {
  *,
  virtual stockLabel : String   // filled by handler, not persisted
}
```

## Service File Layout
```
srv/
  cat-service.cds      ← CatalogService (browse/read)
  admin-service.cds    ← AdminService (full CRUD)
  cat-service.js       ← Node.js handler for CatalogService
  admin-service.js     ← Node.js handler for AdminService
app/
  browse/
    fiori-service.cds  ← UI annotations for CatalogService
  admin/
    fiori-service.cds  ← UI annotations for AdminService
```

## Key Annotations
| Annotation | Effect |
|---|---|
| `@readonly` | Only READ allowed; CREATE/UPDATE/DELETE rejected |
| `@insertonly` | Only CREATE allowed |
| `@path: 'mypath'` | Override URL path for service |
| `@protocol: 'none'` | No external HTTP exposure |
| `@odata` | Expose via OData V4 (default) |
| `@protocol: ['odata','rest']` | Multi-protocol exposure |
| `@cds.autoexpose` | Auto-expose entity when reached via association |

## OData HTTP Mapping
| HTTP Verb | CAP Event |
|---|---|
| GET | READ |
| POST | CREATE |
| PATCH/PUT | UPDATE |
| DELETE | DELETE |
| POST (action) | custom action name |
