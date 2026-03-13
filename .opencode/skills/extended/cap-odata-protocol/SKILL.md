---
name: cap-odata-protocol
description: >
  SAP CAP OData V4 protocol — URL patterns, HTTP verb to event mapping, system query
  options ($select, $filter, $expand, $orderby, $top, $skip, $count), $batch,
  server-driven pagination ($skiptoken), calling actions and functions, parameter aliases,
  and configuring limits and expand depth.
license: SAP Sample Code License
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - OData V4 base paths
    - HTTP verb → CAP event mapping
    - $select / $filter / $expand / $orderby / $top / $skip / $count
    - $batch
    - $skiptoken / pagination
    - actions (POST) and functions (GET)
    - bound vs unbound operations
    - parameter aliases (@p1)
    - @cds.query.limit
    - cds.query.limit.default / max
    - cds.query.restrictions.expand.maxLevels
    - @path override
---

# CAP OData Protocol

## What This Skill Covers

How CAP exposes CDS services over OData V4 — URL conventions, query options, actions,
functions, pagination, and protocol configuration for both Node.js and Java.

## Rules

1. **Always** call `cds-mcp_search_docs` before modifying OData-related configuration or URL patterns.
2. **Always** call `cds-mcp_search_model` to get exact service names, entity names, and paths before building URLs.
3. Prefer declarative configuration (`@cds.query.limit`, `@path`) over custom handler code for protocol behavior.
4. Never rely on the entity or service name casing being identical to the CDS source — always verify with `cds-mcp_search_model`.

---

## URL Structure

```
https://<host>/<base_path>/<service_name>/<EntitySet>
```

| Runtime | Default base path | Example |
|---|---|---|
| Node.js | `/odata/v4` | `http://localhost:4004/odata/v4/CatalogService/Books` |
| Java | `/odata/v4` | `http://localhost:8080/odata/v4/CatalogService/Books` |

Override the service path with `@path`:

```cds
@path: '/catalog'
service CatalogService { ... }
// → served at /catalog/Books
```

Java: override globally in `application.yaml`:

```yaml
cds:
  odataV4:
    endpoint:
      path: /api
```

---

## HTTP Verb → CAP Event Mapping

| HTTP Verb | CAP Event | Notes |
|---|---|---|
| `GET` | `READ` | Used for both collection and single-entity reads |
| `POST` | `CREATE` | Also used to invoke unbound OData actions |
| `PATCH` | `UPDATE` | If entity not found → triggers `CREATE` |
| `PUT` | `UPDATE` | If entity not found → triggers `CREATE` |
| `DELETE` | `DELETE` | |

---

## System Query Options

### `$select` — Projection

```http
GET /CatalogService/Books?$select=ID,title,price
```

### `$filter` — Filtering

```http
GET /CatalogService/Books?$filter=price lt 20 and stock gt 0
GET /CatalogService/Books?$filter=contains(title,'Raven')
GET /CatalogService/Books?$filter=startswith(title,'Cap')
GET /CatalogService/Books?$filter=author/name eq 'Poe'
```

### `$expand` — Eager loading

```http
GET /CatalogService/Books?$expand=author
GET /CatalogService/Orders?$expand=header($expand=items)
GET /CatalogService/Authors?$expand=books($select=ID,title;$filter=stock gt 0)
```

### `$orderby` — Sorting

```http
GET /CatalogService/Books?$orderby=title asc,price desc
```

### `$top` and `$skip` — Client-driven paging

```http
GET /CatalogService/Books?$top=10&$skip=20
```

### `$count` — Include total count

```http
GET /CatalogService/Books?$count=true
# Response includes @odata.count
```

### `$search` — Full-text search (if enabled)

```http
GET /CatalogService/Books?$search=capire
```

---

## Server-Driven Pagination

CAP automatically paginates large result sets and returns `@odata.nextLink`:

```json
{
  "value": [ ... ],
  "@odata.nextLink": "Books?$skiptoken=1000"
}
```

Follow-up request:

```http
GET /CatalogService/Books?$skiptoken=1000
```

### Configure page size limits

In `package.json` (Node.js) or `application.yaml` (Java):

```json
{
  "cds": {
    "query": {
      "limit": {
        "default": 20,
        "max": 100
      }
    }
  }
}
```

```yaml
# Java (application.yaml)
cds:
  query:
    limit:
      default: 20
      max: 100
```

### Annotation-level limits

```cds
@cds.query.limit: 100                // default and max = 100
service CatalogService {
  entity Books as projection on my.Books;

  @cds.query.limit.default: 20       // default page size
  @cds.query.limit.max: 50           // server-enforced maximum
  entity Authors as projection on my.Authors;

  @cds.query.limit: 0                // disable default limit
  entity Tags as projection on my.Tags;
}
```

---

## $batch

Bundle multiple requests in one HTTP call:

```http
POST /CatalogService/$batch
Content-Type: multipart/mixed; boundary=batch_boundary

--batch_boundary
Content-Type: application/http

GET Books HTTP/1.1

--batch_boundary
Content-Type: application/http

POST Orders HTTP/1.1
Content-Type: application/json

{"book_ID": 201, "quantity": 2}
--batch_boundary--
```

Configuration:

```json
{ "cds": { "odata": { "batch_limit": 100 } } }
```

```yaml
# Java
cds:
  odataV4:
    batch:
      maxRequests: 100
```

Increase max request-line size for long URLs inside `$batch` (Node.js):

```yaml
cds.odata.max_batch_header_size: 64KiB
```

---

## Actions and Functions

### CDS Declaration

```cds
service Sue {
  // Unbound
  function sum (x: Integer, y: Integer) returns Integer;
  function stock (id: Foo:ID) returns Integer;
  action add (x: Integer, to: Integer) returns Integer;

  // Bound to entity instance
  entity Foo { key ID: Integer } actions {
    function getStock() returns Integer;
    action order (x: Integer) returns Integer;
  }
}
```

### Calling over HTTP

```http
# Unbound function (GET with parentheses)
GET /sue/sum(x=1,y=2)
GET /sue/stock(id=2)
GET /sue/stock?id=2        # OData v4.01 query-option style (also supported)

# Unbound action (POST with JSON body)
POST /sue/add
Content-Type: application/json
{"x": 11, "to": 2}

# Bound function (service prefix required by OData spec)
GET /sue/Foo(2)/Sue.getStock()

# Bound action
POST /sue/Foo(2)/Sue.order
Content-Type: application/json
{"x": 3}
```

### Parameter aliases

```http
# Simple scalar alias
GET /sue/stock(id=@p)?@p=2

# UUID alias (avoids escaping)
GET /MyService/Orders(ID=@id)?@id=ec806c06-abfe-40c0-b096-c8749aa120f0

# Array parameter
GET /MyService/EmployeesByIDs(IDs=@ids)?@ids=[1,5,8]

# Structured parameter
GET /MyService/EmployeesByName(name=@n)?@n={"first":"Sam","last":"Smith"}
```

### Programmatic invocation (Node.js)

```javascript
const srv = await cds.connect.to('Sue')

// Unbound
await srv.send('sum', { x: 1, y: 2 })
await srv.send('add', { x: 11, to: 2 })

// Bound to instance
await srv.send({
  event: 'order',
  entity: 'Foo',
  data: { x: 3 },
  params: [{ ID: 2 }]
})
```

---

## Deep Read (Expand)

```http
# Nested expand with filter and selection
GET /OrdersService/Orders?$expand=header($expand=items($select=ID,quantity))

# Max expand depth configuration
```

```json
{
  "cds": {
    "query": {
      "restrictions": {
        "expand": { "maxLevels": 3 }
      }
    }
  }
}
```

---

## OData Delta Payload (PATCH with compositions)

Update a parent and modify/remove composition children in one PATCH:

```json
PATCH /OrdersService/Orders('o1')
{
  "ID": "o1",
  "Items@delta": [
    { "ID": "oi1", "amount": 101 },
    { "@id": "OrderItems(oi2)", "@removed": { "reason": "deleted" } }
  ]
}
```

---

## HTTP Test Files

```shell
# Auto-generate .http files for all services
cds add http

# Filter to a specific service
cds add http --filter CatalogService
```

Generated `.http` example:

```http
@server = http://localhost:4004
@auth = Authorization: Basic alice:

### CatalogService.Books
GET {{server}}/odata/v4/CatalogService/Books
{{auth}}
```
