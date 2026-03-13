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
