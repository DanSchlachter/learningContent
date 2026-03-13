using BrowseService from '../../srv/browse-service';

// ─────────────────────────────────────────────────────────────────────────────
// ContentItems — List (browse) Page + detail Object Page
// ─────────────────────────────────────────────────────────────────────────────

annotate BrowseService.ContentItems with @(
  UI: {
    // ── Browse/list page ──────────────────────────────────────────────────
    SelectionFields: [
      contentType,
      category_ID,  // FK column for filter bar
    ],

    LineItem: [
      { Value: title,           Label: 'Title' },
      { Value: contentType,     Label: 'Type' },
      { Value: source,          Label: 'Author / Source' },
      { Value: category.name,   Label: 'Category' },
      { Value: duration,        Label: 'Duration' },
      { Value: modifiedAt,      Label: 'Last Updated' },
      {
        $Type:       'UI.DataFieldWithUrl',
        Value:       title,
        Url:         url,
        Label:       'Open Resource',
        IconUrl:     'sap-icon://action-settings'
      },
    ],

    // ── Detail Object Page header ─────────────────────────────────────────
    HeaderInfo: {
      TypeName:       'Content Item',
      TypeNamePlural: 'Content Items',
      Title:          { Value: title },
      Description:    { Value: source }
    },

    // ── Detail Object Page sections ───────────────────────────────────────
    FieldGroup #Overview: {
      Label: 'Overview',
      Data: [
        { Value: contentType,  Label: 'Type' },
        { Value: duration,     Label: 'Duration' },
        { Value: source,       Label: 'Author / Source' },
        { Value: category.name, Label: 'Category' },
        { Value: modifiedAt,   Label: 'Last Updated' },
      ]
    },

    FieldGroup #Description: {
      Label: 'Description',
      Data: [
        { Value: summary,      Label: 'Summary' },
      ]
    },

    FieldGroup #ExternalLink: {
      Label: 'External Resource',
      Data: [
        {
          $Type: 'UI.DataFieldWithUrl',
          Value: title,
          Url:   url,
          Label: 'Open Resource'
        },
        {
          $Type: 'UI.DataField',
          Value: thumbnailUrl,
          Label: 'Cover Image URL'
        },
      ]
    },

    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Overview',    Target: '@UI.FieldGroup#Overview' },
      { $Type: 'UI.ReferenceFacet', Label: 'Description', Target: '@UI.FieldGroup#Description' },
      { $Type: 'UI.ReferenceFacet', Label: 'Link',        Target: '@UI.FieldGroup#ExternalLink' },
      { $Type: 'UI.ReferenceFacet', Label: 'Tags',        Target: 'tags/@UI.LineItem' },
    ]
  }
);

annotate BrowseService.ContentItems with {
  category @(
    Common: {
      Text:            category.name,
      TextArrangement: #TextOnly,
      ValueList: {
        CollectionPath: 'Categories',
        Parameters: [
          {
            $Type:             'Common.ValueListParameterInOut',
            LocalDataProperty: category_ID,
            ValueListProperty: 'ID'
          },
          {
            $Type:             'Common.ValueListParameterDisplayOnly',
            ValueListProperty: 'name'
          }
        ]
      }
    }
  );
};

// Tags sub-list (read-only)
annotate BrowseService.ContentItems_Tags with @(
  UI.LineItem: [
    { Value: tag.name, Label: 'Tag' },
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// LearningPaths — Browse list + detail Object Page
// ─────────────────────────────────────────────────────────────────────────────

annotate BrowseService.LearningPaths with @(
  UI: {
    LineItem: [
      { Value: title,             Label: 'Title' },
      { Value: estimatedDuration, Label: 'Duration' },
      { Value: modifiedAt,        Label: 'Last Updated' },
    ],

    HeaderInfo: {
      TypeName:       'Learning Path',
      TypeNamePlural: 'Learning Paths',
      Title:          { Value: title },
      Description:    { Value: estimatedDuration }
    },

    FieldGroup #PathOverview: {
      Label: 'Overview',
      Data: [
        { Value: title },
        { Value: estimatedDuration, Label: 'Estimated Duration' },
        { Value: description,       Label: 'Description' },
      ]
    },

    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Overview', Target: '@UI.FieldGroup#PathOverview' },
      { $Type: 'UI.ReferenceFacet', Label: 'Content',  Target: 'items/@UI.LineItem' },
    ]
  }
);

// LearningPathItems sub-list
annotate BrowseService.LearningPathItems with @(
  UI.LineItem: [
    { Value: position,          Label: '#' },
    { Value: item.title,        Label: 'Title' },
    { Value: item.contentType,  Label: 'Type' },
    { Value: item.duration,     Label: 'Duration' },
    {
      $Type: 'UI.DataFieldWithUrl',
      Value: item.title,
      Url:   item.url,
      Label: 'Open'
    },
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Categories — read-only browse
// ─────────────────────────────────────────────────────────────────────────────

annotate BrowseService.Categories with @(
  UI: {
    LineItem: [
      { Value: name,        Label: 'Category' },
      { Value: parent.name, Label: 'Parent' },
    ]
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Tags — read-only browse
// ─────────────────────────────────────────────────────────────────────────────

annotate BrowseService.Tags with @(
  UI: {
    LineItem: [
      { Value: name, Label: 'Tag' },
      { Value: slug, Label: 'Slug' },
    ]
  }
);
