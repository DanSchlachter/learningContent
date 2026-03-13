# Fiori Elements Annotation Patterns

Reference for the AI when writing UI annotations for the Admin and Browse apps.

---

## Overview

All UI is driven by OData V4 annotations. No custom SAPUI5/JavaScript should be written unless
a feature is genuinely impossible with annotations. Annotations live in:

```
app/admin/webapp/annotations.cds    ← Admin app
app/browse/webapp/annotations.cds   ← Browse app
```

Each file starts with a `using` statement referencing the relevant service.

---

## Annotation File Structure

```cds
using AdminService from '../../../srv/admin-service';

// List Report — table columns
annotate AdminService.ContentItems with @(
  UI.LineItem: [ ... ],
  UI.SelectionFields: [ ... ]
);

// Object Page — detail layout
annotate AdminService.ContentItems with @(
  UI.FieldGroup #GeneralInfo: { ... },
  UI.FieldGroup #Taxonomy: { ... },
  UI.Facets: [ ... ]
);

// Field labels (if not already in the service/model)
annotate AdminService.ContentItems with {
  title   @Common.Label: 'Title';
  url     @Common.Label: 'URL';
  status  @Common.Label: 'Status';
}
```

---

## List Report

### LineItem — table columns

```cds
UI.LineItem: [
  { $Type: 'UI.DataField', Value: title,  Label: 'Title'  },
  { $Type: 'UI.DataField', Value: type,   Label: 'Type'   },
  { $Type: 'UI.DataField', Value: status, Label: 'Status' },
  { $Type: 'UI.DataField', Value: category.name, Label: 'Category' },
  { $Type: 'UI.DataField', Value: modifiedAt, Label: 'Updated' }
]
```

### SelectionFields — filter bar

```cds
UI.SelectionFields: [ type, status, category_ID ]
```

### HeaderInfo — title/subtitle shown in the list header

```cds
UI.HeaderInfo: {
  TypeName: 'Content Item',
  TypeNamePlural: 'Content Items',
  Title:    { Value: title },
  Description: { Value: type }
}
```

---

## Object Page

### FieldGroup — logical group of fields

```cds
UI.FieldGroup #GeneralInfo: {
  $Type: 'UI.FieldGroupType',
  Label: 'General Information',
  Data: [
    { $Type: 'UI.DataField', Value: title },
    { $Type: 'UI.DataField', Value: url },
    { $Type: 'UI.DataField', Value: summary },
    { $Type: 'UI.DataField', Value: type },
    { $Type: 'UI.DataField', Value: status }
  ]
},
UI.FieldGroup #Metadata: {
  $Type: 'UI.FieldGroupType',
  Label: 'Metadata',
  Data: [
    { $Type: 'UI.DataField', Value: source },
    { $Type: 'UI.DataField', Value: duration },
    { $Type: 'UI.DataField', Value: thumbnailUrl }
  ]
},
UI.FieldGroup #Taxonomy: {
  $Type: 'UI.FieldGroupType',
  Label: 'Taxonomy',
  Data: [
    { $Type: 'UI.DataField', Value: category_ID },
    { $Type: 'UI.DataField', Value: createdBy },
    { $Type: 'UI.DataField', Value: createdAt }
  ]
}
```

### Facets — page sections referencing FieldGroups

```cds
UI.Facets: [
  {
    $Type: 'UI.ReferenceFacet',
    Label: 'General Information',
    Target: '@UI.FieldGroup#GeneralInfo'
  },
  {
    $Type: 'UI.ReferenceFacet',
    Label: 'Metadata',
    Target: '@UI.FieldGroup#Metadata'
  },
  {
    $Type: 'UI.ReferenceFacet',
    Label: 'Taxonomy',
    Target: '@UI.FieldGroup#Taxonomy'
  },
  {
    $Type: 'UI.ReferenceFacet',
    Label: 'Tags',
    Target: 'tags/@UI.LineItem'    // for a child composition table
  }
]
```

---

## Value Lists (Dropdowns)

Use `@Common.ValueList` for fields backed by another entity or an enum, so Fiori renders a dropdown
or value help dialog.

### Enum value list (inline)

```cds
type ContentType : String @assert.range enum { video; article; course; file; }

annotate AdminService.ContentItems with {
  type @Common.ValueListWithFixedValues: true
       @Common.ValueList: {
    CollectionPath: 'ContentTypes',
    Parameters: [{
      $Type: 'Common.ValueListParameterOut',
      LocalDataProperty: type,
      ValueListProperty: 'code'
    }]
  };
}
```

> For simple enums, the simpler `@Common.ValueListWithFixedValues` together with a synthetic
> `ContentTypes` entity in the service (backed by enum values) is the recommended pattern.

### Association value list (lookup)

```cds
annotate AdminService.ContentItems with {
  category @Common.ValueList: {
    CollectionPath: 'Categories',
    Parameters: [
      {
        $Type: 'Common.ValueListParameterOut',
        LocalDataProperty: category_ID,
        ValueListProperty: 'ID'
      },
      {
        $Type: 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'name'
      }
    ]
  };
}
```

---

## Hiding Fields

Use `@UI.Hidden` to suppress fields that should not appear in the UI (technical keys, soft-delete flag):

```cds
annotate AdminService.ContentItems with {
  isDeleted   @UI.Hidden;
  category_ID @UI.Hidden;   // show category.name instead, not the raw UUID
}
```

---

## Read-only Fields on Object Page

```cds
annotate AdminService.ContentItems with {
  createdAt  @UI.HiddenFilter  @Core.Immutable;
  createdBy  @UI.HiddenFilter  @Core.Immutable;
  modifiedAt @UI.HiddenFilter;
}
```

---

## Browse App — Card Layout

The Browse app uses a `ListReport` with a card-style feel. Key difference: no edit actions.

```cds
using BrowseService from '../../../srv/browse-service';

annotate BrowseService.ContentItems with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: title },
    { $Type: 'UI.DataField', Value: type },
    { $Type: 'UI.DataField', Value: source },
    { $Type: 'UI.DataField', Value: duration },
    { $Type: 'UI.DataField', Value: category.name, Label: 'Category' }
  ],
  UI.SelectionFields: [ type, category_ID ],
  UI.HeaderInfo: {
    TypeName: 'Learning Resource',
    TypeNamePlural: 'Learning Resources',
    Title:       { Value: title },
    Description: { Value: summary }
  }
);
```

---

## Actions on Object Page

```cds
// CDS action definition in service
action publish() returns ContentItem;
action archive() returns ContentItem;

// Annotation to add buttons on object page
annotate AdminService.ContentItems with @(
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'AdminService.publish', Label: 'Publish' },
    { $Type: 'UI.DataFieldForAction', Action: 'AdminService.archive', Label: 'Archive' }
  ]
);
```

---

## manifest.json — App Descriptor Key Settings

For a List Report + Object Page layout, the `manifest.json` must declare:

```json
{
  "sap.ui5": {
    "routing": {
      "routes": [
        { "name": "ContentItemsList",   "target": "ContentItemsList" },
        { "name": "ContentItemsObjectPage", "target": "ContentItemsObjectPage" }
      ],
      "targets": {
        "ContentItemsList": {
          "type": "Component",
          "id": "ContentItemsList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "entitySet": "ContentItems"
            }
          }
        },
        "ContentItemsObjectPage": {
          "type": "Component",
          "id": "ContentItemsObjectPage",
          "name": "sap.fe.templates.ObjectPage",
          "options": {
            "settings": {
              "entitySet": "ContentItems"
            }
          }
        }
      }
    }
  }
}
```

---

## Common Pitfalls

| Pitfall | Correct approach |
|---|---|
| Writing custom XML views | Use annotation-only approach; Fiori elements generates the view |
| Hardcoding labels in `DataField` | Set `@title` on the entity element in the model instead |
| Missing `$Type` in `DataField` | Always include `$Type: 'UI.DataField'` |
| Using `category_ID` in LineItem | Use `category.name` (navigates the association) |
| Forgetting `@UI.Hidden` on technical fields | Hide `isDeleted`, raw FK fields, internal IDs |
| `SelectionFields` referencing non-existent element | Element must exist in the service projection |
