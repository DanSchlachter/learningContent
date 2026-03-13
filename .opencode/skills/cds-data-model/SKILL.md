---
name: cds-data-model
description: Step-by-step patterns for writing CDS entity definitions in db/schema.cds — cuid keys, managed aspect, enums, associations, soft delete, and many-to-many join entities for the Learning Content Management app.
license: MIT
compatibility: opencode
metadata:
  layer: db
  file: db/schema.cds
---

## When to use this skill
Load this skill before creating or modifying any entity in `db/schema.cds`.

---

## Entity skeleton

```cds
using { cuid, managed } from '@sap/cds/common';

entity ContentItem : cuid, managed {
  title        : String(255)  @title: 'Title';
  url          : String(2000) @title: 'URL';
  type         : ContentType  @title: 'Content Type';
  summary      : String(2000) @title: 'Summary';
  source       : String(255)  @title: 'Source / Author';
  duration     : String(50)   @title: 'Duration';
  status       : Status       @title: 'Status';
  thumbnailUrl : String(2000) @title: 'Thumbnail URL';
  isDeleted    : Boolean default false;
  category     : Association to Category;
  tags         : Composition of many ContentItem_Tags on tags.item = $self;
}
```

- `cuid` provides `key ID : UUID` — auto-generated on create
- `managed` provides `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` — auto-filled by CAP
- Every field must have `@title: 'Label'` — required for Fiori column headers

---

## Enums

```cds
type ContentType : String @assert.range enum {
  video;
  article;
  course;
  file;
}

type Status : String @assert.range enum {
  draft;
  published;
  archived;
}
```

Always define enums as separate `type` declarations at the top of the file.

---

## Hierarchical entity (self-association)

```cds
entity Category : cuid {
  name     : String(255) @title: 'Name';
  slug     : String(255) @title: 'Slug';
  parent   : Association to Category;
  children : Association to many Category on children.parent = $self;
}
```

---

## Many-to-many join entity

```cds
entity ContentItem_Tags {
  key item : Association to ContentItem;
  key tag  : Association to Tag;
}
```

Use explicit join entities. Never use `many-to-many` shorthand in CAP.

---

## Ordered child collection

```cds
entity LearningPathItem {
  key learningPath : Association to LearningPath;
  key item         : Association to ContentItem;
  position         : Integer @title: 'Position';
}

entity LearningPath : cuid, managed {
  title             : String(255)  @title: 'Title';
  description       : String(2000) @title: 'Description';
  coverImageUrl     : String(2000) @title: 'Cover Image URL';
  status            : PathStatus   @title: 'Status';
  estimatedDuration : String(50)   @title: 'Estimated Duration';
  isDeleted         : Boolean default false;
  items             : Composition of many LearningPathItem on items.learningPath = $self;
}
```

---

## Soft delete pattern

NEVER physically delete `ContentItem` or `LearningPath`.

```cds
// In the entity:
isDeleted : Boolean default false;

// In the AdminService projection:
entity ContentItems as select from db.ContentItem where isDeleted = false;

// In the handler:
await UPDATE(ContentItems).set({ isDeleted: true }).where({ ID: req.params[0] })
```

---

## Full project schema structure

```
namespace learningContent;

using { cuid, managed } from '@sap/cds/common';

type ContentType : String @assert.range enum { video; article; course; file; }
type Status      : String @assert.range enum { draft; published; archived; }
type PathStatus  : String @assert.range enum { draft; published; }
type UserStatus  : String @assert.range enum { active; inactive; }

entity Category { ... }
entity Tag      { ... }
entity ContentItem { ... }
entity ContentItem_Tags { ... }
entity LearningPath { ... }
entity LearningPathItem { ... }
entity AdminUser { ... }
```

---

## Compile check

After every model change:
```bash
npx cds compile db/schema.cds --to json
```
Fix all errors before proceeding.
