---
name: cds-queries-cqn
description: >
  CAP CQL/CQN query building and execution — SELECT, INSERT, UPDATE, DELETE, UPSERT
  in both Node.js (cds.ql) and Java (CqnService builders). Covers fluent API, tagged
  template literals, parameterized execution, batch execution, deep updates, and
  cds.ql.clone() for safe query mutation.
license: SAP Sample Code License
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - cds.ql
    - CQN
    - SELECT / INSERT / UPDATE / DELETE / UPSERT
    - parameterized queries
    - batch execution
    - deep update (CdsList.delta)
    - cds.ql.clone
    - CqnService
    - CqnAnalyzer
---

# CAP CQL / CQN Query Building & Execution

## What This Skill Covers

Building and running CQL (CDS Query Language) statements programmatically via:

- **Node.js** — `cds.ql` tagged template literals, fluent builders (`SELECT.from`, `INSERT.into`, …), and `cds.run(query)`
- **Java** — `Select`, `Insert`, `Update`, `Delete`, `Upsert` builders from `com.sap.cds.ql` and `CqnService.run(query)`

## Rules

1. **Always** call `cds-mcp_search_docs` before writing or modifying query code to verify current API shapes.
2. **Always** call `cds-mcp_search_model` to confirm entity names, element names, and service endpoints before constructing queries.
3. Use CDS model annotations (`@readonly`, `@insertonly`, `@assert.range`, …) to enforce constraints declaratively — only fall back to custom query logic when annotations cannot express the requirement.
4. Use **parameterized queries** (`param()` in Java, tagged template literals in Node.js) — never concatenate user input into query strings.
5. Use `cds.ql.clone(q)` in Node.js before mutating a shared query object to avoid side effects.

---

## Node.js — `cds.ql`

### Three equivalent ways to build a query

```javascript
const cds = require('@sap/cds')
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql

// 1. Tagged template literal (CQL string)
const q1 = cds.ql`SELECT from Books where ID=${201}`

// 2. Fluent builder
const q2 = SELECT.from('Books').where({ ID: 201 })

// 3. Raw CQN object
const q3 = {
  SELECT: {
    from: { ref: ['Books'] },
    where: [{ ref: ['ID'] }, '=', { val: 201 }]
  }
}

// Execute any of the above
const results = await cds.run(q2)
```

### SELECT — common patterns

```javascript
// All columns
const books = await SELECT.from('bookshop.Books')

// Specific columns
const titles = await SELECT`ID,title from Books`

// Fluent with where + orderBy + limit
const recent = await SELECT.from('Books')
  .where({ stock: { '>': 0 } })
  .orderBy('title')
  .limit(10, 0)           // (top, skip)

// Expand with helpers
const { ref, val, expand, columns, where, orderBy } = cds.ql
const q = {
  SELECT: {
    from: ref`Authors`,
    columns: [
      ref`ID`, ref`name`,
      expand(ref`books`, where`stock>7`, orderBy`title`, columns`ID,title`)
    ],
    where: [ref`name`, 'like', val('%Poe%')]
  }
}
await cds.run(q)
```

### INSERT

```javascript
// Single entry
await INSERT.into('Books').entries({ ID: 201, title: 'Capire' })

// Multiple entries
await INSERT.into('Books').entries([
  { ID: 202, title: 'CAP Guide' },
  { ID: 203, title: 'CDS Handbook' }
])
```

### UPDATE

```javascript
// Update by key
await UPDATE('Books', 201).with({ title: 'Updated Title' })

// Update with where clause
await UPDATE('Books').where({ stock: { '<': 5 } }).with({ stock: 5 })
```

### DELETE

```javascript
await DELETE.from('Books').where({ ID: 201 })
```

### Safe query mutation with `cds.ql.clone()`

```javascript
// Do NOT mutate a shared query directly — clone it first
const base = SELECT.from`Books`.orderBy`genre.name`
const sorted = cds.ql.clone(base)
sorted.orderBy`title desc`
const result = await cds.run(sorted)
// base remains unchanged
```

### Reading/writing via service (recommended in handlers)

```javascript
// Inside a service handler use this (srv) rather than cds.db directly
module.exports = class BookshopService extends cds.ApplicationService {
  async init() {
    this.before('READ', 'Books', async req => {
      const total = await SELECT.one`count(*) as n from Books`
      req.info(`Total books: ${total.n}`)
    })
    return super.init()
  }
}
```

---

## Java — `com.sap.cds.ql` Builders

### Select

```java
import com.sap.cds.ql.Select;
import com.sap.cds.ql.cqn.CqnSelect;

// String-based (dynamic)
CqnSelect q1 = Select.from("bookshop.Books")
    .columns("title", "price")
    .where(b -> b.get("stock").gt(0))
    .orderBy(b -> b.get("title").asc())
    .limit(10);

// Generated types (static / type-safe) — preferred
import static bookshop.Bookshop_.BOOKS;
CqnSelect q2 = Select.from(BOOKS)
    .columns(b -> b.title(), b -> b.price())
    .where(b -> b.stock().gt(0));

Result result = service.run(q2);
// Map rows to generated accessor
List<Books> books = result.listOf(Books.class);
```

### Insert

```java
import com.sap.cds.ql.Insert;

Books book = Books.create();
book.setId(201);
book.setTitle("Capire");

CqnInsert insert = Insert.into(BOOKS).entry(book);
service.run(insert);

// Bulk
CqnInsert bulk = Insert.into(BOOKS).entries(List.of(b1, b2));
service.run(bulk);
```

### Update

```java
import com.sap.cds.ql.Update;
import com.sap.cds.ql.CQL;

// Simple update by ID
CqnUpdate u1 = Update.entity(BOOKS).byId(201).data("title", "New Title");

// Expression-based (computed) update
CqnUpdate u2 = Update.entity(BOOKS).byId(101)
    .set(b -> b.stock(), s -> s.minus(1));   // stock = stock - 1

// Fluent where + set
CqnUpdate u3 = Update.entity(BOOKS)
    .where(b -> b.title().eq("CAP"))
    .set(b -> b.title(), title -> title.toUpper())
    .set(b -> b.stock(), stock -> stock.plus(1));

service.run(u3);
```

### Deep Update with `CdsList.delta()`

```java
import com.sap.cds.CdsList;
import bookshop.Orders;
import bookshop.OrderItem;

Orders order = Orders.create(1000);
order.setStatus("in process");

OrderItem item1 = OrderItem.create(1); item1.setQuantity(2);  // modify
OrderItem item2 = OrderItem.create(2);                         // mark for removal
OrderItem item4 = OrderItem.create(4); item4.setQuantity(4);  // create new

order.setItems(CdsList.delta(item1, item2.forRemoval(), item4));

CqnUpdate deepUpdate = Update.entity("Orders").data(order);
service.run(deepUpdate);
```

### Delete

```java
import com.sap.cds.ql.Delete;

// Dynamic where
CqnDelete d1 = Delete.from(BOOKS).where(b -> b.id().eq(201));

// matching (example-based, good for composite keys)
CqnDelete d2 = Delete.from("bookshop.Books").matching(Map.of("ID", 201));

// Cascading delete (also deletes compositions)
service.run(Delete.from("bookshop.Orders").matching(Map.of("OrderNo", 1000)));
```

### Upsert (update-or-insert, PATCH semantics)

```java
import com.sap.cds.ql.Upsert;

Books b = Books.create(101);
b.setTitle("Odyssey");
CqnUpsert u = Upsert.into(BOOKS).entry(b);
service.run(u);

// Bulk
CqnUpsert bulk = Upsert.into(BOOKS).entries(List.of(b1, b2));
service.run(bulk);
```

> **Upsert limitations:** no UUID auto-generation, no `@cds.on.insert` handling, all keys and mandatory fields must be supplied.

### Parameterized & Batch Execution

```java
import static com.sap.cds.ql.CQL.param;

// Named parameters
CqnDelete del = Delete.from(BOOKS)
    .where(b -> b.get("ID").eq(param("id")));
service.run(del, Map.of("id", 201));

// Batch (same statement, multiple parameter sets)
CqnDelete batch = Delete.from(BOOKS).byParams("ID");
service.run(batch, List.of(
    Map.of("ID", 201),
    Map.of("ID", 202)
));
long deleted = result.rowCount(); // total rows across all batches
```

### Parsing raw CQN JSON

```java
// Parse a CQN JSON string (single quotes are for readability; use real double quotes)
CqnSelect parsed = Select.cqn(
    "{'SELECT': {'from': {'ref': ['bookshop.Books']}}}"
);
// Still composable after parsing
CqnSelect withCols = Select.cqn(cqnString).columns("title", "price");
```

### Follow-up queries from results

```java
// Build a follow-up query from a result entity reference
CqnUpdate update = Update.entity(AUTHOR).data("name", "James Joyce").byId(101);
Author joyce = service.run(update).single(Author.class);

CqnSelect books = Select.from(joyce.ref().books());
service.run(books);
```

---

## CQN Shape Reference

| Operation | Node.js builder | Java builder | CQN top-level key |
|---|---|---|---|
| Read | `SELECT.from(...)` | `Select.from(...)` | `SELECT` |
| Create | `INSERT.into(...)` | `Insert.into(...)` | `INSERT` |
| Update | `UPDATE(...).with(...)` | `Update.entity(...)` | `UPDATE` |
| Delete | `DELETE.from(...)` | `Delete.from(...)` | `DELETE` |
| Upsert | — | `Upsert.into(...)` | `UPSERT` |

## Node.js `cds.read` Shorthand

```javascript
// Equivalent convenience shortcuts
await cds.read`Books`
await cds.read`Books where ID=201`
await cds.read`ID,title from Books`
```

## Interactive Exploration

```shell
# Start cds REPL to try queries interactively
cds init bookshop --nodejs --add sample && cd bookshop
cds repl --run .
```
