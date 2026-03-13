---
name: cap-service-design
description: Patterns for CAP OData service definitions (srv/*.cds) and Node.js event handler implementations (srv/*.js) — AdminService with auth, BrowseService public, status transitions, soft delete, and CDS QL.
license: MIT
compatibility: opencode
metadata:
  layer: srv
  files: "srv/admin-service.cds, srv/admin-service.js, srv/browse-service.cds, srv/browse-service.js"
---

## When to use this skill
Load before writing or editing any file in `srv/`.

---

## AdminService skeleton (`srv/admin-service.cds`)

```cds
using { learningContent as db } from '../db/schema';

@path: 'admin'
@requires: 'admin'
service AdminService {

  entity ContentItems as select from db.ContentItem
    where isDeleted = false;

  entity Categories   as projection on db.Category;
  entity Tags         as projection on db.Tag;
  entity LearningPaths as select from db.LearningPath
    where isDeleted = false;
  entity LearningPathItems as projection on db.LearningPathItem;
  entity AdminUsers   as projection on db.AdminUser;

  action publish()   returns ContentItems;
  action archive()   returns ContentItems;
  action softDelete() returns Boolean;
  action duplicate(itemID: UUID) returns ContentItems;
}
```

Key rules:
- `@requires: 'admin'` is MANDATORY — never remove
- `where isDeleted = false` on ContentItems and LearningPaths
- Actions defined with `action` keyword, implemented in the `.js` handler

---

## BrowseService skeleton (`srv/browse-service.cds`)

```cds
using { learningContent as db } from '../db/schema';

@path: 'browse'
service BrowseService {

  @readonly entity ContentItems as select from db.ContentItem
    where status = 'published' and isDeleted = false;

  @readonly entity Categories as projection on db.Category;

  @readonly entity Tags as projection on db.Tag;

  @readonly entity LearningPaths as select from db.LearningPath
    where status = 'published' and isDeleted = false;

  @readonly entity LearningPathItems as projection on db.LearningPathItem;
}
```

Key rules:
- NO `@requires` — public access
- `@readonly` on all entities
- BOTH `status = 'published'` AND `isDeleted = false` filters required

---

## Handler skeleton (`srv/admin-service.js`)

```js
const cds = require('@sap/cds')
const log = cds.log('admin-service')

module.exports = class AdminService extends cds.ApplicationService {
  async init() {
    const { ContentItems } = this.entities

    this.before('CREATE', ContentItems, this._setDefaults.bind(this))
    this.before('UPDATE', ContentItems, this._validateStatusTransition.bind(this))
    this.on('softDelete', ContentItems, this._softDelete.bind(this))
    this.on('publish',    ContentItems, this._publish.bind(this))
    this.on('archive',    ContentItems, this._archive.bind(this))
    this.on('duplicate',  ContentItems, this._duplicate.bind(this))

    await super.init()
  }

  async _setDefaults(req) {
    req.data.status ??= 'draft'
  }

  async _validateStatusTransition(req) {
    if (!req.data.status) return
    const { ContentItems } = cds.entities('learningContent')
    const item = await SELECT.one.from(ContentItems).where({ ID: req.data.ID })
    if (!item) return req.error(404, `ContentItem ${req.data.ID} not found`)

    const ALLOWED = { draft: ['published'], published: ['archived'] }
    if (!ALLOWED[item.status]?.includes(req.data.status)) {
      return req.error(400,
        `Invalid status transition: ${item.status} → ${req.data.status}`)
    }
  }

  async _softDelete(req) {
    const { ContentItems } = cds.entities('learningContent')
    const n = await UPDATE(ContentItems)
      .set({ isDeleted: true })
      .where({ ID: req.params[0] })
    if (n === 0) return req.error(404, 'ContentItem not found')
  }

  async _publish(req) {
    const { ContentItems } = cds.entities('learningContent')
    const item = await SELECT.one.from(ContentItems).where({ ID: req.params[0] })
    if (!item) return req.error(404, 'Not found')
    if (item.status !== 'draft') return req.error(400, `Can only publish from draft, current: ${item.status}`)
    await UPDATE(ContentItems).set({ status: 'published' }).where({ ID: req.params[0] })
    return SELECT.one.from(ContentItems).where({ ID: req.params[0] })
  }

  async _archive(req) {
    const { ContentItems } = cds.entities('learningContent')
    const item = await SELECT.one.from(ContentItems).where({ ID: req.params[0] })
    if (!item) return req.error(404, 'Not found')
    if (item.status !== 'published') return req.error(400, `Can only archive from published, current: ${item.status}`)
    await UPDATE(ContentItems).set({ status: 'archived' }).where({ ID: req.params[0] })
    return SELECT.one.from(ContentItems).where({ ID: req.params[0] })
  }

  async _duplicate(req) {
    const { ContentItems } = cds.entities('learningContent')
    const { itemID } = req.data
    const original = await SELECT.one.from(ContentItems).where({ ID: itemID })
    if (!original) return req.error(404, 'ContentItem not found')
    const { ID, createdAt, createdBy, modifiedAt, modifiedBy, ...copy } = original
    copy.title = `Copy of ${copy.title}`
    copy.status = 'draft'
    copy.isDeleted = false
    const result = await INSERT.into(ContentItems).entries(copy)
    return result
  }
}
```

---

## CDS QL reference

```js
// Read
const items = await SELECT.from(ContentItems).where({ status: 'published' })
const item  = await SELECT.one.from(ContentItems).where({ ID })

// Insert
await INSERT.into(ContentItems).entries({ title: '...', status: 'draft' })

// Update
await UPDATE(ContentItems).set({ status: 'published' }).where({ ID })

// Do NOT use — use softDelete action instead
// await DELETE.from(ContentItems).where({ ID })
```

---

## Common mistakes

| Wrong | Correct |
|---|---|
| `DELETE.from(ContentItems)` | Set `isDeleted = true` |
| `console.log(...)` | `cds.log('ns').info(...)` |
| `req.reject(400, ...)` inside `on` handler | `req.error(400, ...)` then return |
| Auth check in handler code | `@requires: 'admin'` in service `.cds` |
| Skipping `await super.init()` | Always call `await super.init()` at end of `init()` |
