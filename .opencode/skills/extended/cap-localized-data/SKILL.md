---
name: cap-localized-data
description: >
  SAP CAP localized data — declaring localized elements in CDS, generated texts
  entities and localized views, serving locale-aware reads automatically, accessing
  the user locale in handlers, @cds.localized: false opt-out, initial translation
  data via CSV, and SQLite/H2 localized view config.
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - localized keyword in CDS
    - Books.texts generated entity
    - localized.Books generated view
    - coalesce fallback to base language
    - $user.locale / req.locale
    - @cds.localized: false
    - initial data CSV for texts entity
    - cds.i18n.for_sqlite / for_sql
    - transitive localized views (removed in cds8)
    - @cds.collate: false (HANA)
---

# CAP Localized Data

## What This Skill Covers

Modeling, deploying, and serving locale-aware (translated) data in CAP — from CDS
declarations through runtime serving and initial seed data.

## Rules

1. **Always** call `cds-mcp_search_docs` before adding or changing localized elements.
2. **Always** call `cds-mcp_search_model` to confirm entity and element names before writing queries.
3. Use the `localized` keyword in CDS — never manually model the texts entity or localized view; the compiler generates them automatically.
4. Prefer accessing localized data through the generated `localized.*` service views; read the base entity directly only when you explicitly need raw stored values.
5. Entity keys must not be associations.

---

## Declaring Localized Elements

```cds
entity Books {
  key ID       : UUID;
      title    : localized String;      // translated per locale
      descr    : localized String;
      price    : Decimal;
      currency : Currency;
}
```

### What the CDS compiler generates

```cds
// 1. Separate texts table
entity Books.texts {
  key locale : sap.common.Locale;   // String(14)
  key ID     : UUID;                // mirrors source key
      title  : String;
      descr  : String;
}

// 2. Source entity extended with associations
extend entity Books with {
  texts    : Composition of many Books.texts on texts.ID = ID;
  localized: Association to Books.texts
               on localized.ID = ID and localized.locale = $user.locale;
}

// 3. Localized view (coalesces translated values with base fallback)
entity localized.Books as select from Books { *,
  coalesce(localized.title, title) as title,
  coalesce(localized.descr, descr) as descr
};
```

The runtime **automatically redirects** service reads to the `localized.*` view — no
handler code needed.

---

## Service Projections

```cds
using { Books } from './books';

service CatalogService {
  // Locale-aware (default) — reads from localized.CatalogService.BooksList
  entity BooksList    as projection on Books { ID, title, price };
  entity BooksDetails as projection on Books;

  // Disable localization for a specific projection
  @cds.localized: false
  entity BooksRaw     as projection on Books;
}
```

---

## Accessing the User Locale in Handlers

```javascript
// Node.js — inside any event handler
module.exports = (srv) => {
  srv.before('READ', 'Books', req => {
    const locale = req.locale   // e.g. 'de', 'fr', 'zh_TW'
    console.log('Serving locale:', locale)
  })
}
```

```java
// Java — inside an event handler
@Before(event = CqnService.EVENT_READ, entity = "Books")
public void logLocale(CdsReadEventContext context) {
    String locale = context.getParameterInfo().getLocale();
    logger.info("Locale: {}", locale);
}
```

---

## Writing Translations

### Via OData (create/update texts)

```http
POST /CatalogService/Books
Content-Type: application/json

{
  "ID": "...",
  "title": "Default Title",
  "texts": [
    { "locale": "de", "title": "Deutsches Buch" },
    { "locale": "fr", "title": "Livre Français" }
  ]
}
```

### Via CSV seed files

```csv
// db/data/my.bookshop-Books.csv
ID;title;descr
1;Poems;Collection of poems

// db/data/my.bookshop-Books_texts.csv
ID;locale;title;descr
1;de;Gedichte;Gedichtsammlung
1;fr;Poèmes;Recueil de poèmes
```

---

## SQLite / H2 — Pre-generate Localized Views

For SQLite or H2, pre-declare which locales need views (in `package.json`):

```json
{
  "cds": {
    "i18n": {
      "for_sqlite": ["en", "de", "fr"]
    }
  }
}
```

For H2:

```json
{
  "cds": {
    "i18n": {
      "for_sql": ["en", "de", "fr"]
    }
  }
}
```

---

## Locale Collation on HANA

By default, all `String` elements use locale-aware collation on HANA. Disable it for
elements that don't need it:

```cds
entity Books : cuid {
  title  : localized String(111);     // locale-aware
  descr  : localized String(1111);    // locale-aware

  @cds.collate: false
  isbn   : String(40);                // binary comparison, faster
}
```

---

## Transitive Localized Views (cds8+)

As of cds8, CAP no longer generates localized views for entities that only **reference**
localized entities via associations (no own localized elements). This reduces DB objects:

```cds
entity Books   { key ID: Integer; title: localized String; }
entity Authors { key ID: Integer; name: String; books: Association to many Books; }
// → localized.Authors is NOT generated (Authors has no own localized elements)
```

---

## Quick Reference

| Concept | How |
|---|---|
| Declare translated field | `element : localized String` |
| Texts table | Auto-generated: `<Entity>.texts` |
| Localized view | Auto-generated: `localized.<Entity>` |
| Access locale (Node.js) | `req.locale` |
| Access locale (Java) | `context.getParameterInfo().getLocale()` |
| Disable localization | `@cds.localized: false` on service entity |
| Seed translations | `<Entity>_texts.csv` in `db/data/` |
| SQLite localized views | `"i18n": { "for_sqlite": ["en","de"] }` |
