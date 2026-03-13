---
name: cds-data-modeling
description: CDS domain modeling in SAP CAP - entities, types, aspects, associations, compositions, and reuse from @sap/cds/common
license: MIT
compatibility: opencode
metadata:
  topic: SAP CAP
  runtime: Node.js, Java
---

## What I do

Guide you in writing correct CDS (Core Data Services) models for SAP CAP applications, covering:

- Entities, elements, and built-in types
- Custom scalar types and structured types
- Aspects for reuse and annotation carriers
- Managed associations (to-one, to-many) and unmanaged associations
- Compositions (owned children, deep operations)
- Namespaces and `using` imports
- Reuse types and aspects from `@sap/cds/common` (`cuid`, `managed`, `CodeList`, `Currency`, `Country`)
- Annotations: `@title`, `@description`, `localized`, `@readonly`, `@insertonly`
- `extend` to add fields or aspects to existing entities
- **Declarative validation**: `@mandatory`, `@assert.range`, `@assert.format`, `@assert.unique`, `@assert.target`, `@assert` expressions, `not null`

## Rules

- ALWAYS search for CDS definitions using `cds-mcp_search_model` before reading `.cds` files.
- ALWAYS verify CDS syntax with `cds-mcp_search_docs` before proposing a model change.
- Place domain models in `db/schema.cds`; never define domain entities in service files.
- Use `@sap/cds/common` reuse types (`cuid`, `managed`, `Currency`, `Country`, `Language`) wherever applicable.
- Prefer `managed` aspect for `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`; avoid redefining these manually.
- Use `Composition of many` for owned child collections (e.g., order items); use `Association` for references to independent entities.
- Prefer `key ID : UUID` via the `cuid` aspect over integer keys.
- Annotate human-readable labels with `@title` (maps to `@Common.Label` in OData).
- Use `localized` keyword for multi-language text fields.
- Group related entities with a shared `namespace` or `context`.
- Use `extend` instead of modifying imported or shared base models.
- **Prefer declarative validation annotations over custom handler code** — use `@mandatory`, `@assert.range`, `@assert.format`, `@assert.unique`, `@assert.target`, and `@assert` expressions whenever the constraint can be expressed in CDS. Only fall back to custom handlers for logic that cannot be expressed declaratively.

## Common Patterns

### Minimal entity with UUID key and managed fields
```cds
using { cuid, managed } from '@sap/cds/common';

entity Books : cuid, managed {
  title  : localized String(111) @title: 'Title';
  descr  : localized String(1111);
  stock  : Integer;
  price  : Decimal(9,2);
}
```

### Associations and compositions
```cds
entity Authors : cuid, managed {
  name  : String(111) @title: 'Author Name';
  books : Association to many Books on books.author = $self;
}

entity Books : cuid, managed {
  title  : String(111);
  author : Association to Authors;      // managed to-one → generates author_ID FK
  genre  : Association to Genres;
}

entity Orders : cuid, managed {
  OrderNo : String @title: 'Order Number';
  items   : Composition of many OrderItems on items.order = $self;
}

entity OrderItems : cuid {
  order    : Association to Orders;
  book     : Association to Books;
  quantity : Integer;
  amount   : Decimal(9,2);
}
```

### Reuse aspect as annotation carrier
```cds
@restrict: [{ grant: ['READ','WRITE'], where: 'CreatedBy = $user' }]
aspect RestrictToOwner {};

extend Orders  with RestrictToOwner;
extend Reviews with RestrictToOwner;
```

### Custom scalar type
```cds
type NumericString : String;

entity Address {
  zipCode : NumericString(5);
}
```

### Extend an existing entity
```cds
extend Books with {
  isbn : String(13) @title: 'ISBN';
}
```

### Reuse types from @sap/cds/common
```cds
using { Currency, Country } from '@sap/cds/common';

entity Products : cuid, managed {
  name     : localized String(111);
  currency : Currency;   // Association to sap.common.Currencies
  country  : Country;    // Association to sap.common.Countries
}
```

## Declarative Validation (prefer over custom handler code)

CAP enforces these annotations automatically — no handler code needed.

### @mandatory — required field
```cds
entity Books : cuid {
  title  : String @mandatory;   // rejected if null/empty on CREATE/UPDATE
  stock  : Integer not null;    // DB-level NOT NULL constraint
}
```

### @assert.range — numeric, date, or enum range
```cds
entity Products : cuid {
  price    : Decimal   @assert.range: [0.01, _];          // > 0
  stock    : Integer   @assert.range: [(0), _];           // strictly positive
  priority : String    @assert.range enum { high; medium; low; };
  validTo  : DateTime  @assert.range: ['2024-01-01', '2099-12-31'];
}
```

### @assert.format — regex pattern
```cds
entity Contacts : cuid {
  @assert.format: '/^\S+@\S+\.\S+$/'
  @assert.format.message: 'Provide a valid email address'
  email : String;
}
```

### @assert.unique — uniqueness constraint
```cds
// Single field
annotate Books with @assert.unique: { isbn: [ isbn ] };

// Composite uniqueness
annotate OrderItems with @assert.unique.product: [ order, product ];
```

### @assert.target — referential integrity at service level
```cds
entity Books : cuid {
  author : Association to Authors @assert.target;  // author must exist on CREATE/UPDATE
}
```

### @assert expression — cross-field and complex rules
Use in separate annotation files (e.g. `srv/admin-constraints.cds`) to keep service definitions clean:
```cds
using { AdminService } from './admin-service';
annotate AdminService.Books with {

  title @mandatory;

  author @assert: (case
    when not exists author then 'Specified Author does not exist'
  end);

  price @assert.range: [1, 111];
  stock @assert.range: [(0), _];
}

// Cross-field validation
annotate TravelService.Travels with {
  BeginDate @mandatory @assert: (case
    when BeginDate > EndDate then 'Begin date must be before end date'
    when exists Bookings[Flight.date < Travel.BeginDate]
      then 'All bookings must be within the travel period'
  end);
}
```

## File Layout
```
db/
  schema.cds        ← domain entities + aspects
  data/             ← CSV seed data (Books.csv, Authors.csv, …)
srv/
  admin-service.cds
  cat-service.cds
```

## Built-in Types Reference
| CDS Type | Notes |
|---|---|
| `UUID` | Auto-generated; use via `cuid` aspect |
| `String(n)` | Variable-length string |
| `Integer` / `Int64` | Integer numbers |
| `Decimal(p,s)` | Fixed-precision decimal |
| `Boolean` | true/false |
| `Date` / `Time` / `DateTime` / `Timestamp` | Date/time types |
| `LargeBinary` | Binary/blob |
| `localized String` | Multi-language text (generates `_texts` table) |

## Useful CLI Commands
```sh
cds compile db/schema.cds --to sql    # verify generated DDL
cds compile db/schema.cds --to json   # inspect CSN output
cds watch                             # live reload during development
```
