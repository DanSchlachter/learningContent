using AdminService from '../../srv/admin-service';

// ─────────────────────────────────────────────────────────────────────────────
// ContentItems — List Page + Object Page (draft-enabled)
// ─────────────────────────────────────────────────────────────────────────────

annotate AdminService.ContentItems with @odata.draft.enabled;

annotate AdminService.ContentItems with @(
  UI: {
    // ── List Page ──────────────────────────────────────────────────────────
    SelectionFields: [
      contentType,
      status,
      category_ID,
    ],

    LineItem: [
      { Value: title,            Label: 'Title' },
      { Value: contentType,      Label: 'Type' },
      { Value: status,           Label: 'Status' },
      { Value: category.name,    Label: 'Category' },
      { Value: source,           Label: 'Author / Source' },
      { Value: duration,         Label: 'Duration' },
      { Value: modifiedAt,       Label: 'Last Updated' },
      {
        $Type:  'UI.DataFieldForAction',
        Action: 'AdminService.bulkPublish',
        Label:  'Publish'
      },
      {
        $Type:  'UI.DataFieldForAction',
        Action: 'AdminService.bulkArchive',
        Label:  'Archive'
      },
    ],

    // ── Object Page header ─────────────────────────────────────────────────
    HeaderInfo: {
      TypeName:       'Content Item',
      TypeNamePlural: 'Content Items',
      Title:          { Value: title },
      Description:    { Value: source }
    },

    // ── Object Page sections ───────────────────────────────────────────────
    FieldGroup #BasicInfo: {
      Label: 'Basic Information',
      Data: [
        { Value: title },
        { Value: url,           Label: 'URL' },
        { Value: contentType,   Label: 'Content Type' },
        { Value: status,        Label: 'Status' },
        { Value: category.name, Label: 'Category' },
      ]
    },

    FieldGroup #Details: {
      Label: 'Details',
      Data: [
        { Value: summary,       Label: 'Summary' },
        { Value: source,        Label: 'Author / Source' },
        { Value: duration,      Label: 'Duration' },
        { Value: thumbnailUrl,  Label: 'Thumbnail URL' },
      ]
    },

    FieldGroup #Metadata: {
      Label: 'Metadata',
      Data: [
        { Value: createdBy,     Label: 'Created By' },
        { Value: createdAt,     Label: 'Created At' },
        { Value: modifiedBy,    Label: 'Modified By' },
        { Value: modifiedAt,    Label: 'Modified At' },
      ]
    },

    Facets: [
      {
        $Type:  'UI.ReferenceFacet',
        Label:  'Basic Information',
        Target: '@UI.FieldGroup#BasicInfo'
      },
      {
        $Type:  'UI.ReferenceFacet',
        Label:  'Details',
        Target: '@UI.FieldGroup#Details'
      },
      {
        $Type:  'UI.ReferenceFacet',
        Label:  'Tags',
        Target: 'tags/@UI.LineItem'
      },
      {
        $Type:  'UI.ReferenceFacet',
        Label:  'Metadata',
        Target: '@UI.FieldGroup#Metadata'
      },
    ]
  }
);

// Display text + value help for category association
annotate AdminService.ContentItems with {
  category @(
    Common: {
      Text:            category.name,
      TextArrangement: #TextOnly,
      ValueList: {
        CollectionPath: 'Categories',
        Parameters: [
          { $Type: 'Common.ValueListParameterOut',          LocalDataProperty: category_ID, ValueListProperty: 'ID' },
          { $Type: 'Common.ValueListParameterDisplayOnly',  ValueListProperty: 'name' },
        ]
      }
    }
  );
  contentType @Common.ValueListWithFixedValues: true;
};

// Tags sub-list
annotate AdminService.ContentItems_Tags with @(
  UI.LineItem: [
    { Value: tag.name, Label: 'Tag' },
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Categories — List Page + Object Page
// ─────────────────────────────────────────────────────────────────────────────

annotate AdminService.Categories with @(
  UI: {
    SelectionFields: [ parent_ID ],

    LineItem: [
      { Value: name,          Label: 'Name' },
      { Value: slug,          Label: 'Slug' },
      { Value: parent.name,   Label: 'Parent' },
    ],

    HeaderInfo: {
      TypeName:       'Category',
      TypeNamePlural: 'Categories',
      Title:          { Value: name },
      Description:    { Value: slug }
    },

    FieldGroup #CatInfo: {
      Label: 'Category',
      Data: [
        { Value: name },
        { Value: slug },
        { Value: parent.name, Label: 'Parent Category' },
      ]
    },

    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Category', Target: '@UI.FieldGroup#CatInfo' },
    ]
  }
);

annotate AdminService.Categories with {
  parent @(
    Common: {
      Text:            parent.name,
      TextArrangement: #TextOnly,
      ValueList: {
        CollectionPath: 'Categories',
        Parameters: [
          { $Type: 'Common.ValueListParameterOut',          LocalDataProperty: parent_ID, ValueListProperty: 'ID' },
          { $Type: 'Common.ValueListParameterDisplayOnly',  ValueListProperty: 'name' },
        ]
      }
    }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tags — List Page + Object Page
// ─────────────────────────────────────────────────────────────────────────────

annotate AdminService.Tags with @(
  UI: {
    LineItem: [
      { Value: name, Label: 'Name' },
      { Value: slug, Label: 'Slug' },
    ],

    HeaderInfo: {
      TypeName:       'Tag',
      TypeNamePlural: 'Tags',
      Title:          { Value: name },
      Description:    { Value: slug }
    },

    FieldGroup #TagInfo: {
      Label: 'Tag',
      Data: [
        { Value: name },
        { Value: slug },
      ]
    },

    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Tag', Target: '@UI.FieldGroup#TagInfo' },
    ]
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// LearningPaths — List Page + Object Page (draft-enabled)
// ─────────────────────────────────────────────────────────────────────────────

annotate AdminService.LearningPaths with @odata.draft.enabled;

annotate AdminService.LearningPaths with @(
  UI: {
    SelectionFields: [ status ],

    LineItem: [
      { Value: title,              Label: 'Title' },
      { Value: status,             Label: 'Status' },
      { Value: estimatedDuration,  Label: 'Duration' },
      { Value: modifiedAt,         Label: 'Last Updated' },
    ],

    HeaderInfo: {
      TypeName:       'Learning Path',
      TypeNamePlural: 'Learning Paths',
      Title:          { Value: title },
      Description:    { Value: status }
    },

    FieldGroup #PathInfo: {
      Label: 'Learning Path',
      Data: [
        { Value: title },
        { Value: status },
        { Value: estimatedDuration,  Label: 'Estimated Duration' },
        { Value: coverImageUrl,      Label: 'Cover Image URL' },
        { Value: description },
      ]
    },

    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Details',  Target: '@UI.FieldGroup#PathInfo' },
      { $Type: 'UI.ReferenceFacet', Label: 'Items',    Target: 'items/@UI.LineItem' },
    ]
  }
);

// LearningPathItems sub-list
annotate AdminService.LearningPathItems with @(
  UI.LineItem: [
    { Value: position,         Label: 'Position' },
    { Value: item.title,       Label: 'Content Item' },
    { Value: item.contentType, Label: 'Type' },
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// AdminUsers — List Page + Object Page
// ─────────────────────────────────────────────────────────────────────────────

annotate AdminService.AdminUsers with @(
  UI: {
    SelectionFields: [ status ],

    LineItem: [
      { Value: name,       Label: 'Name' },
      { Value: email,      Label: 'Email' },
      { Value: status,     Label: 'Status' },
      { Value: lastLogin,  Label: 'Last Login' },
    ],

    HeaderInfo: {
      TypeName:       'Admin User',
      TypeNamePlural: 'Admin Users',
      Title:          { Value: name },
      Description:    { Value: email }
    },

    FieldGroup #UserInfo: {
      Label: 'User',
      Data: [
        { Value: name },
        { Value: email },
        { Value: status },
        { Value: lastLogin },
      ]
    },

    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'User Details', Target: '@UI.FieldGroup#UserInfo' },
    ]
  }
);
