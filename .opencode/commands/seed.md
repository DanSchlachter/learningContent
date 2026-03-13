---
description: Scaffold CSV seed data for local SQLite development
agent: build
---

Read `db/schema.cds` first to understand all entity shapes and field names.

Create seed CSV files in `db/data/` — one file per entity, named `learningContent-<EntityName>.csv`.

Requirements:
- **5 rows minimum** per entity
- **Cover all enum values**: all content types (video, article, course, file), all statuses (draft, published, archived)
- **Hierarchical categories**: at least one parent category with two child categories
- **Learning path**: at least one LearningPath with 3+ ordered LearningPathItems (use correct `position` values 1, 2, 3...)
- **Tags**: at least 5 tags with varied names
- **ContentItem variety**: mix of all statuses, all types; at least one with `isDeleted = true`
- **All IDs**: use fixed UUIDs (not random) so data is reproducible across restarts
- **All UUIDs**: format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Files to create:
```
db/data/learningContent-Category.csv
db/data/learningContent-Tag.csv
db/data/learningContent-ContentItem.csv
db/data/learningContent-ContentItem_Tags.csv
db/data/learningContent-LearningPath.csv
db/data/learningContent-LearningPathItem.csv
db/data/learningContent-AdminUser.csv
```

After creating all CSV files, verify the server starts cleanly:

!`npx cds build 2>&1`

Then confirm data loads:

!`npx cds deploy --to sqlite:db.sqlite && echo "SEED OK" 2>&1`
