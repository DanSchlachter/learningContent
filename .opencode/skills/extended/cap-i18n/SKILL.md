---
name: cap-i18n
description: >
  SAP CAP i18n text bundles — properties file placement, {i18n>KEY} annotations in
  CDS models, merging algorithm, locale normalization, preserved locales, cds.i18n
  Node.js API for labels and messages, and extension project i18n.
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - _i18n/i18n.properties file placement
    - i18n_<locale>.properties files
    - "{i18n>KEY}" annotation syntax in CDS
    - merging algorithm (fallback → default lang → requested lang)
    - locale normalization
    - preserved locales (zh_TW, en_GB, …)
    - cds.i18n.preserved_locales config
    - cds.i18n.labels.at() / cds.i18n.messages.at() (Node.js)
    - i18n in extension projects
---

# CAP i18n — Text Bundles & Localization

## What This Skill Covers

Externalizing and translating UI labels, annotation texts, and runtime messages in CAP
using `.properties` text bundles.

## Rules

1. **Always** call `cds-mcp_search_docs` before changing i18n configuration.
2. Place `_i18n/` folders **adjacent to the `.cds` files** they translate — CAP discovers them automatically.
3. Always provide a fallback `i18n.properties` (no locale suffix) for default strings.
4. Use `{i18n>KEY}` syntax for annotation values — never hardcode locale-specific strings in CDS models.
5. Keep i18n files in version control — they are not secrets.

---

## File Placement

CAP searches for `_i18n/i18n*.properties` files in every directory that contains `.cds`
sources (and their parents):

```
bookshop/
├─ app/
│  ├─ browse/
│  │  ├─ fiori.cds
│  │  └─ _i18n/
│  │     ├─ i18n.properties        ← fallback for app/browse
│  │     ├─ i18n_en.properties
│  │     └─ i18n_de.properties
│  └─ _i18n/
│     └─ i18n.properties           ← fallback for app/
├─ srv/
│  ├─ cat-service.cds
│  └─ _i18n/
│     ├─ i18n.properties
│     └─ i18n_de.properties
├─ db/
│  └─ _i18n/
│     └─ i18n.properties
└─ _i18n/                          ← root-level fallback (recommended)
   ├─ i18n.properties
   ├─ i18n_en.properties
   ├─ i18n_de.properties
   └─ i18n_fr.properties
```

---

## Properties File Format

```properties
# _i18n/i18n.properties  (default fallback)
Book        = Book
Books       = Books
CreatedAt   = Created At
NotFound    = Not found

# _i18n/i18n_de.properties
Book        = Buch
Books       = Bücher
CreatedAt   = Erstellt am
NotFound    = Nicht gefunden

# _i18n/i18n_fr.properties
Book        = Livre
Books       = Livres
CreatedAt   = Créé le
```

---

## Using i18n Keys in CDS Annotations

```cds
// srv/cat-service.cds
service Bookshop {
  entity Books @(
    UI.HeaderInfo: {
      Title.Label     : '{i18n>Book}',
      TypeName        : '{i18n>Book}',
      TypeNamePlural  : '{i18n>Books}',
    },
    UI.LineItem: [
      { Value: title,     Label: '{i18n>BookTitle}' },
      { Value: createdAt, Label: '{i18n>CreatedAt}' }
    ]
  ) { /* ... */ }
}
```

At runtime CAP resolves `{i18n>KEY}` from the bundle matching the request locale.

---

## Merging Algorithm

CAP overlays bundles in this order (last wins):

| Priority | Source |
|---|---|
| 1 (lowest) | `i18n.properties` — default fallback |
| 2 | `i18n_en.properties` — default language bundle |
| 3 | `i18n_<requested-locale>.properties` — specific language |
| 4 (highest) | CDS model annotations |

So `i18n_de.properties` overrides `i18n.properties` for German requests.

---

## Locale Normalization

CAP normalizes incoming locales to their base language code by default:
`en-US` → `en`, `de-AT` → `de`, `zh-TW` → `zh`.

### Preserved locales (not normalized)

Some locales are preserved as-is by default:

| Locale | Language |
|---|---|
| `zh_CN` | Chinese — China |
| `zh_HK` | Chinese — Hong Kong |
| `zh_TW` | Chinese traditional — Taiwan |
| `en_GB` | English — UK |
| `fr_CA` | French — Canada |
| `pt_PT` | Portuguese — Portugal |
| `es_CO` | Spanish — Colombia |
| `es_MX` | Spanish — Mexico |
| `en_US_x_saptrc` | SAP tracing (`sap-language=1Q`) |
| `en_US_x_sappsd` | SAP pseudo (`sap-language=2Q`) |

### Add custom preserved locales (`package.json`)

```json
{
  "cds": {
    "i18n": {
      "preserved_locales": [
        "en_GB",
        "fr_CA",
        "pt_PT",
        "pt_BR",
        "zh_CN",
        "zh_HK",
        "zh_TW"
      ]
    }
  }
}
```

> If you declare a locale as preserved, provide a bundle for it — otherwise the runtime
> falls back to `en`.

---

## Node.js `cds.i18n` API

```javascript
const cds = require('@sap/cds')

// Look up a UI label by key and optional locale
cds.i18n.labels.at('CreatedAt', 'de')   // → 'Erstellt am'
cds.i18n.labels.at('CreatedAt')         // → 'Created At' (uses cds.context.locale)

// Look up a runtime message
cds.i18n.messages.at('ASSERT_FORMAT', ['wrong email', /\w+@\w+/])

// Look up using a CDS definition (requires cds.context.locale to be set)
const { CatalogService } = cds.services
const { Books } = CatalogService.entities
const { title } = Books.elements

cds.context = { locale: 'fr' }          // usually set by protocol adapters
cds.i18n.labels.at(Books)               // → 'Livre'
cds.i18n.labels.at(title)              // → 'Titre'
```

---

## i18n in Extension Projects

Extensions can ship their own translations. Keys that collide with the SaaS base app's
translations **take precedence**:

```
my-extension/
└─ i18n/
   └─ i18n.properties
```

```properties
# my-extension/i18n/i18n.properties
SalesRegion_name_col = Sales Region
Orders_priority_col  = Priority
```

After updating translations, run `cds build` to pick up changes.
Requires `@sap/cds` 6.3.0 or higher.

---

## Quick Reference

| Task | How |
|---|---|
| Default fallback bundle | `_i18n/i18n.properties` |
| German bundle | `_i18n/i18n_de.properties` |
| Reference key in CDS | `'{i18n>KEY}'` |
| Look up label (Node.js) | `cds.i18n.labels.at('KEY', 'de')` |
| Preserve locale variant | `cds.i18n.preserved_locales` in `package.json` |
| Extension translations | `i18n/i18n.properties` in extension project |
