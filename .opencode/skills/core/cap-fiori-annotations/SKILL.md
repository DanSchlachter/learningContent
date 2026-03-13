---
name: cap-fiori-annotations
description: SAP CAP Fiori Elements annotations - LineItem, SelectionFields, FieldGroup, Facets, ObjectPage, draft support, value helps
compatibility:
  runtime: [nodejs, java]
metadata:
  topics:
    - UI.LineItem (list page columns)
    - UI.SelectionFields (filter bar)
    - UI.FieldGroup and UI.Facets (Object Page sections)
    - UI.HeaderInfo (Object Page header)
    - "@odata.draft.enabled"
    - "@cds.odata.valuelist"
    - "@Common.Text / @Common.TextArrangement"
    - "@UI.Hidden"
    - "@title / @description"
    - annotation file placement
---

# CAP Fiori Elements Annotations

## What This Skill Covers

Guide you in writing CDS UI annotations for SAP Fiori Elements applications built on CAP, covering:

- `UI.LineItem` for list page columns
- `UI.SelectionFields` for filter bar fields
- `UI.FieldGroup` and `UI.Facets` for Object Page sections
- `UI.HeaderInfo` for Object Page header
- `@odata.draft.enabled` for draft-based editing
- `@cds.odata.valuelist` for value helps on associations
- `@title` / `@description` as portable label annotations
- `@UI.Hidden` for conditional field visibility
- `@Common.Text` and `@Common.TextArrangement` for display values
- Annotation file placement and project structure

## Rules

- ALWAYS check `cds-mcp_search_model` for service/entity definitions before adding annotations.
- ALWAYS check `cds-mcp_search_docs` before using unfamiliar annotation vocabulary terms.
- Keep UI annotations SEPARATE from service definitions: place them in `app/<app-name>/fiori-service.cds`, not in `srv/`.
- Use `annotate <Service>.<Entity> with @(...)` — do not modify the service CDS file directly for UI concerns.
- Prefer `@title` over `@Common.Label` directly in models; CAP compiles `@title` to `@Common.Label` in EDMX.
- Use `{i18n>Key}` references in labels to support translations.
- Enable `@odata.draft.enabled` only on the root entity of a draft-enabled composition tree.
- Add `@cds.odata.valuelist` to code-list entities (e.g., `Currencies`, `Countries`) so all associations to them get value help automatically.
- For Object Pages, always provide `UI.HeaderInfo` with `TypeName` and `Title`.

## Common Patterns

### List Page (SelectionFields + LineItem)
```cds
// app/browse/fiori-service.cds
using CatalogService from '../../srv/cat-service';

annotate CatalogService.Books with @(
  UI: {
    SelectionFields: [ author_ID, genre_ID, price ],
    LineItem: [
      { Value: title,           Label: 'Title' },
      { Value: author.name,     Label: '{i18n>Author}' },
      { Value: genre.name,      Label: 'Genre' },
      { Value: price,           Label: 'Price' },
      { Value: currency.symbol, Label: ' ' },
      { Value: stock,           Label: 'Stock' },
    ]
  }
);
```

### Object Page header
```cds
annotate AdminService.Books with @(
  UI.HeaderInfo: {
    TypeName:       'Book',
    TypeNamePlural: 'Books',
    Title:          { Value: title },
    Description:    { Value: author.name }
  }
);
```

### Object Page sections (FieldGroup + Facets)
```cds
annotate AdminService.Books with @(
  UI: {
    FieldGroup #General: {
      Label: 'General Information',
      Data: [
        { Value: title },
        { Value: author_ID },
        { Value: genre_ID },
      ]
    },
    FieldGroup #Pricing: {
      Label: 'Pricing',
      Data: [
        { Value: price },
        { Value: currency_code },
        { Value: stock },
      ]
    },
    Facets: [
      {
        $Type:  'UI.ReferenceFacet',
        Label:  'General',
        Target: '@UI.FieldGroup#General'
      },
      {
        $Type:  'UI.ReferenceFacet',
        Label:  'Pricing',
        Target: '@UI.FieldGroup#Pricing'
      }
    ]
  }
);
```

### Draft support
```cds
// Enable draft on admin entity
annotate AdminService.Books with @odata.draft.enabled;

// Override draft creation with a custom action (optional)
// CDS: @Common.DraftRoot.NewAction: 'AdminService.createDraft'
```

### Value help via @cds.odata.valuelist
```cds
// In db/schema.cds or a shared types file:
using { sap.common.Currencies } from '@sap/cds/common';

// @cds.odata.valuelist is already set on sap.common.Currencies in @sap/cds/common.
// For custom code-list entities:
@cds.odata.valuelist
entity Genres : CodeList {
  key code : String(20);
}
// All associations pointing to Genres will now auto-generate Common.ValueList in EDMX.
```

### @Common.Text for display values
```cds
annotate AdminService.Books with {
  author_ID @(
    Common: {
      Text: author.name,
      TextArrangement: #TextOnly
    }
  );
  genre_ID @(
    Common.Text: genre.name
  );
}
```

### Conditional field visibility
```cds
annotate AdminService.Orders with {
  internalNote @UI.Hidden: (status <> 'open');
}
```

### Portable labels with @title
```cds
// In db/schema.cds — applies everywhere the entity is used
annotate db.Books with {
  title  @title: 'Title';
  price  @title: 'Price';
  stock  @title: 'Stock';
}
```

### Draft lifecycle handlers (Node.js)
```js
srv.on('NEW',     MyEntity.drafts, req => { /* init draft */ })
srv.on('PATCH',   MyEntity.drafts, req => { /* validate on each patch */ })
srv.on('SAVE',    MyEntity.drafts, req => { /* validate before activation */ })
srv.on('EDIT',    MyEntity,        req => { /* on edit of active instance */ })
srv.on('DISCARD', MyEntity.drafts, req => { /* cleanup on discard */ })
```

## Annotation File Layout
```
app/
  browse/
    fiori-service.cds   ← annotates CatalogService (list page)
  admin/
    fiori-service.cds   ← annotates AdminService (object page + draft)
  services.cds          ← imports both fiori-service files
srv/
  cat-service.cds       ← service definition (no UI annotations here)
  admin-service.cds
```

## Key Annotations Quick Reference
| Annotation | Purpose |
|---|---|
| `UI.LineItem` | Columns in list/table view |
| `UI.SelectionFields` | Filter bar fields |
| `UI.HeaderInfo` | Object Page title/subtitle |
| `UI.FieldGroup` | Group of fields in a section |
| `UI.Facets` | Object Page section layout |
| `@odata.draft.enabled` | Enable draft editing |
| `@cds.odata.valuelist` | Auto value help for associations |
| `@Common.Text` | Display value next to ID |
| `@Common.TextArrangement` | #TextOnly / #TextFirst / #TextLast |
| `@UI.Hidden` | Conditionally hide a field |
| `@title` | Portable label (→ `@Common.Label`) |
| `@description` | Tooltip/description (→ `@Core.Description`) |
| `@hierarchy` | Enable recursive hierarchy/tree view (cds9+); replaces verbose `@Aggregation.RecursiveHierarchy` annotations — use `annotate Srv.Entity with @hierarchy;` on an entity with a self-referential `parent` association |
