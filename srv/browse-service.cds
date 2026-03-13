using { learning.content as db } from '../db/schema';

/**
 * BrowseService — public read-only service for learners.
 * No authentication required (@requires: 'any').
 * Exposed at /odata/v4/browse.
 *
 * Only 'published' content is surfaced via a where-clause filter.
 */
@path: 'browse'
@requires: 'any'
service BrowseService {

  // ── Content Items (published only) ────────────────────────────────────────

  @readonly
  entity ContentItems as select from db.ContentItems
    where status = 'published' and isDeleted = false;

  @readonly
  entity ContentItems_Tags as projection on db.ContentItems_Tags;

  // ── Taxonomy (read-only) ─────────────────────────────────────────────────

  @readonly entity Categories as projection on db.Categories;
  @readonly entity Tags       as projection on db.Tags;

  // ── Learning Paths (published only) ──────────────────────────────────────

  @readonly
  entity LearningPaths as select from db.LearningPaths
    where status = 'published';

  @readonly entity LearningPathItems as projection on db.LearningPathItems;

  // ── Full-text search function ─────────────────────────────────────────────

  /**
   * Full-text search across title and summary.
   * Returns matching published ContentItems.
   * All parameters are optional — omit to get all published items.
   */
  function searchContent(
    q            : String,
    contentType  : db.ContentType,
    categoryId   : UUID,
    tagId        : UUID,
    fromDate     : Date,
    toDate       : Date
  ) returns many BrowseService.ContentItems;
}
