using { learning.content as db } from '../db/schema';

/**
 * AdminService — full CRUD for Learning & Development administrators.
 * Requires the 'Admin' role; exposed at /odata/v4/admin.
 */
@path: 'admin'
@requires: 'Admin'
service AdminService {

  // ── Content Items ──────────────────────────────────────────────────────────

  entity ContentItems as projection on db.ContentItems
    actions {
      /** Change the status of a single content item. */
      action changeStatus(newStatus : db.PublishStatus) returns ContentItems;
      /** Duplicate this content item (creates a new Draft). */
      action duplicate() returns ContentItems;
    };

  entity ContentItems_Tags as projection on db.ContentItems_Tags;

  // ── Taxonomy ───────────────────────────────────────────────────────────────

  entity Categories as projection on db.Categories;
  entity Tags       as projection on db.Tags;

  // ── Learning Paths ─────────────────────────────────────────────────────────

  entity LearningPaths     as projection on db.LearningPaths;
  entity LearningPathItems as projection on db.LearningPathItems;

  // ── Admin User Management ─────────────────────────────────────────────────

  entity AdminUsers as projection on db.AdminUsers;

  // ── Bulk Actions ──────────────────────────────────────────────────────────

  /** Publish all selected content items by ID. */
  action bulkPublish(ids : many UUID)  returns Integer;

  /** Archive all selected content items by ID. */
  action bulkArchive(ids : many UUID)  returns Integer;

  /** Soft-delete all selected content items by ID. */
  action bulkDelete(ids : many UUID)   returns Integer;

  /** Re-categorize all selected content items to a new category. */
  action bulkRecategorize(ids : many UUID, categoryId : UUID) returns Integer;
}
