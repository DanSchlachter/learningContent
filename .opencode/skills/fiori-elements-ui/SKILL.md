---
name: fiori-elements-ui
description: Patterns for SAP Fiori elements annotations in app/*/webapp/annotations.cds — LineItem, FieldGroup, Facets, ValueList, action buttons, UI.Hidden, and manifest.json structure for Admin and Browse apps.
license: MIT
compatibility: opencode
metadata:
  layer: app
  files: "app/admin/webapp/annotations.cds, app/browse/webapp/annotations.cds"
---

## When to use this skill
Load before writing or editing any file in `app/*/webapp/`.

---

## File header (always required)

```cds
// Admin app:
using AdminService from '../../../srv/admin-service';

// Browse app:
using BrowseService from '../../../srv/browse-service';
```

---

## List Report — required annotations

```cds
annotate AdminService.ContentItems with @(

  UI.HeaderInfo: {
    TypeName: 'Content Item',
    TypeNamePlural: 'Content Items',
    Title:       { Value: title },
    Description: { Value: type }
  },

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: title,         Label: 'Title'    },
    { $Type: 'UI.DataField', Value: type,          Label: 'Type'     },
    { $Type: 'UI.DataField', Value: status,        Label: 'Status'   },
    { $Type: 'UI.DataField', Value: category.name, Label: 'Category' },
    { $Type: 'UI.DataField', Value: modifiedAt,    Label: 'Updated'  },
    { $Type: 'UI.DataFieldForAction',
      Action: 'AdminService.ContentItems/publish',  Label: 'Publish'  },
    { $Type: 'UI.DataFieldForAction',
      Action: 'AdminService.ContentItems/archive',  Label: 'Archive'  }
  ],

  UI.SelectionFields: [ type, status, category_ID ]
);
```

---

## Object Page — FieldGroups and Facets

```cds
annotate AdminService.ContentItems with @(

  UI.FieldGroup #GeneralInfo: {
    $Type: 'UI.FieldGroupType',
    Label: 'General Information',
    Data: [
      { $Type: 'UI.DataField', Value: title   },
      { $Type: 'UI.DataField', Value: url     },
      { $Type: 'UI.DataField', Value: summary },
      { $Type: 'UI.DataField', Value: type    },
      { $Type: 'UI.DataField', Value: status  }
    ]
  },

  UI.FieldGroup #Metadata: {
    $Type: 'UI.FieldGroupType',
    Label: 'Metadata',
    Data: [
      { $Type: 'UI.DataField', Value: source       },
      { $Type: 'UI.DataField', Value: duration     },
      { $Type: 'UI.DataField', Value: thumbnailUrl }
    ]
  },

  UI.FieldGroup #Taxonomy: {
    $Type: 'UI.FieldGroupType',
    Label: 'Taxonomy',
    Data: [
      { $Type: 'UI.DataField', Value: category_ID },
      { $Type: 'UI.DataField', Value: createdBy   },
      { $Type: 'UI.DataField', Value: createdAt   }
    ]
  },

  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'General Information', Target: '@UI.FieldGroup#GeneralInfo' },
    { $Type: 'UI.ReferenceFacet', Label: 'Metadata',            Target: '@UI.FieldGroup#Metadata'    },
    { $Type: 'UI.ReferenceFacet', Label: 'Taxonomy',            Target: '@UI.FieldGroup#Taxonomy'    },
    { $Type: 'UI.ReferenceFacet', Label: 'Tags',                Target: 'tags/@UI.LineItem'          }
  ]
);
```

---

## ValueList for associations

```cds
annotate AdminService.ContentItems:category with @(
  Common.ValueList: {
    CollectionPath: 'Categories',
    Parameters: [
      { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: category_ID, ValueListProperty: 'ID'   },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]
  },
  Common.Text: category.name,
  Common.TextArrangement: #TextOnly
);
```

## ValueList for enums (fixed values)

```cds
annotate AdminService.ContentItems with {
  type   @Common.ValueListWithFixedValues: true;
  status @Common.ValueListWithFixedValues: true;
};
```

---

## Field-level annotations

```cds
annotate AdminService.ContentItems with {
  summary      @UI.MultiLineText;
  url          @Common.Label: 'URL';
  thumbnailUrl @Common.Label: 'Thumbnail URL';
  isDeleted    @UI.Hidden;
  category_ID  @UI.Hidden;
};
```

---

## Read-only / immutable fields

```cds
annotate AdminService.ContentItems with {
  createdAt  @UI.HiddenFilter @Core.Immutable;
  createdBy  @UI.HiddenFilter @Core.Immutable;
  modifiedAt @UI.HiddenFilter;
};
```

---

## Browse App annotations (read-only, no actions)

```cds
annotate BrowseService.ContentItems with @(

  UI.HeaderInfo: {
    TypeName: 'Learning Resource',
    TypeNamePlural: 'Learning Resources',
    Title:       { Value: title   },
    Description: { Value: summary }
  },

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: title,         Label: 'Title'    },
    { $Type: 'UI.DataField', Value: type,          Label: 'Type'     },
    { $Type: 'UI.DataField', Value: source,        Label: 'Source'   },
    { $Type: 'UI.DataField', Value: duration,      Label: 'Duration' },
    { $Type: 'UI.DataField', Value: category.name, Label: 'Category' }
  ],

  UI.SelectionFields: [ type, category_ID ],

  UI.PresentationVariant: {
    SortOrder: [{ Property: createdAt, Descending: true }],
    Visualizations: ['@UI.LineItem']
  }
);
```

---

## manifest.json routing (List Report + Object Page)

```json
{
  "sap.ui5": {
    "routing": {
      "routes": [
        { "name": "ContentItemsList",       "target": "ContentItemsList"       },
        { "name": "ContentItemsObjectPage", "target": "ContentItemsObjectPage" }
      ],
      "targets": {
        "ContentItemsList": {
          "type": "Component",
          "id": "ContentItemsList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": { "entitySet": "ContentItems" }
          }
        },
        "ContentItemsObjectPage": {
          "type": "Component",
          "id": "ContentItemsObjectPage",
          "name": "sap.fe.templates.ObjectPage",
          "options": {
            "settings": { "entitySet": "ContentItems" }
          }
        }
      }
    }
  }
}
```

---

## Common mistakes

| Wrong | Correct |
|---|---|
| Omit `$Type: 'UI.DataField'` | Always include `$Type` |
| `Value: category_ID` in LineItem | `Value: category.name` (navigate association) |
| Custom XML views | Annotation-only approach |
| Missing `@UI.Hidden` on `isDeleted` | Always hide technical fields |
| `SelectionFields` referencing non-existent element | Element must exist in the service projection |
| Missing `using` import at top of file | Always add the correct `using` statement |
