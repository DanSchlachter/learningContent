namespace learning.content;

using { cuid, managed } from '@sap/cds/common';

// ──────────────────────────────────────────────────────────────────────────────
// Taxonomy
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hierarchical category. Each ContentItem belongs to one Category.
 * Parent is optional – top-level categories have no parent.
 */
entity Categories : cuid, managed {
  name     : String(200) not null  @title: 'Name';
  slug     : String(200) not null  @title: 'Slug';
  parent   : Association to Categories @title: 'Parent Category';
  children : Association to many Categories on children.parent = $self;
}

/**
 * Flat tag list. ContentItems may carry multiple tags.
 */
entity Tags : cuid, managed {
  name : String(100) not null @title: 'Name';
  slug : String(100) not null @title: 'Slug';
}

// ──────────────────────────────────────────────────────────────────────────────
// Content
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Enumeration-style type codes for ContentItem.
 * Stored as String; validated via @assert.range.
 */
type ContentType : String(20) enum {
  video    = 'video';
  article  = 'article';
  course   = 'course';
  file     = 'file';
}

/**
 * Workflow status shared by ContentItem and LearningPath.
 */
type PublishStatus : String(20) enum {
  draft     = 'draft';
  published = 'published';
  archived  = 'archived';
}

/**
 * Core content entry — a curated link to an external learning resource.
 */
entity ContentItems : cuid, managed {
  title         : String(500)  not null  @title: 'Title'         @mandatory;
  url           : String(2048) not null  @title: 'URL'           @mandatory;
  contentType   : ContentType  not null  @title: 'Content Type'  @mandatory;
  summary       : String(2000) not null  @title: 'Summary'       @mandatory;
  source        : String(300)            @title: 'Author / Source';
  duration      : String(50)             @title: 'Duration';
  thumbnailUrl  : String(2048)           @title: 'Thumbnail URL';
  status        : PublishStatus not null @title: 'Status' default 'draft';
  category      : Association to Categories not null @title: 'Category' @assert.target;
  tags          : Composition of many ContentItems_Tags on tags.item = $self;
  isDeleted     : Boolean default false  @title: 'Deleted';
}

/**
 * Join entity: many-to-many between ContentItems and Tags.
 */
entity ContentItems_Tags : cuid {
  item : Association to ContentItems not null;
  tag  : Association to Tags         not null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Learning Paths
// ──────────────────────────────────────────────────────────────────────────────

/**
 * An ordered collection of ContentItems presented as a learning journey.
 */
entity LearningPaths : cuid, managed {
  title             : String(500)  not null  @title: 'Title'       @mandatory;
  description       : String(2000)           @title: 'Description';
  coverImageUrl     : String(2048)           @title: 'Cover Image URL';
  status            : PublishStatus not null @title: 'Status' default 'draft';
  estimatedDuration : String(50)             @title: 'Estimated Duration';
  items             : Composition of many LearningPathItems on items.path = $self;
}

/**
 * Ordered item within a LearningPath.
 */
entity LearningPathItems : cuid {
  path     : Association to LearningPaths  not null;
  item     : Association to ContentItems   not null;
  position : Integer not null default 1    @title: 'Position';
}

// ──────────────────────────────────────────────────────────────────────────────
// Admin Users
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Application-level admin accounts (separate from CAP mock auth users).
 * Status: active | inactive.
 */
type AdminStatus : String(20) enum {
  active   = 'active';
  inactive = 'inactive';
}

entity AdminUsers : cuid, managed {
  email     : String(254) not null  @title: 'Email';
  name      : String(200) not null  @title: 'Name';
  status    : AdminStatus not null  @title: 'Status' default 'active';
  lastLogin : Timestamp             @title: 'Last Login';
}
