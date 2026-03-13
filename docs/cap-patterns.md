# CAP / CDS Coding Patterns

Reference for the AI when writing CDS models, service definitions, and Node.js handlers.

---

## Data Model (`db/schema.cds`)

### Entity skeleton

```cds
using { cuid, managed } from '@sap/cds/common';

entity ContentItem : cuid, managed {
  title       : String(256) @title: 'Title';
  url         : String(1024) @title: 'URL';
  type        : ContentType  @title: 'Content Type';
  summary     : String(2000) @title: 'Summary';
  status      : Status       @title: 'Status';
  isDeleted   : Boolean default false;
  category    : Association to Category;
  tags        : Composition of many ContentItem_Tags on tags.item = $self;
}
```

- `cuid` provides `key ID : UUID` auto-generated
- `managed` provides `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` auto-filled by CAP
- Always annotate with `@title` for Fiori labels

### Enums

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

### Hierarchical entity (self-association)

```cds
entity Category : cuid {
  name     : String(128) @title: 'Name';
  slug     : String(128);
  parent   : Association to Category;
  children : Association to many Category on children.parent = $self;
}
```

### Many-to-many join entity

```cds
entity ContentItem_Tags {
  key item : Association to ContentItem;
  key tag  : Association to Tag;
}
```

### Soft delete pattern

Never physically delete `ContentItem`. Always use:
```js
await UPDATE(ContentItems).set({ isDeleted: true }).where({ ID: req.params[0] });
```
Filter in the service projection:
```cds
entity ContentItems as select from db.ContentItem where isDeleted = false;
```

---

## Service Definitions (`srv/`)

### AdminService skeleton

```cds
using { db } from '../db/schema';

@path: 'admin'
@requires: 'admin'
service AdminService {
  entity ContentItems as projection on db.ContentItem;
  entity Categories   as projection on db.Category;
  entity Tags         as projection on db.Tag;
  entity LearningPaths as projection on db.LearningPath;
  entity AdminUsers   as projection on db.AdminUser;

  action duplicateItem(itemID: UUID) returns ContentItem;
}
```

### BrowseService skeleton

```cds
using { db } from '../db/schema';

@path: 'browse'
service BrowseService {
  @readonly entity ContentItems as select from db.ContentItem
    where status = 'published' and isDeleted = false;

  @readonly entity Categories as projection on db.Category;
  @readonly entity LearningPaths as select from db.LearningPath
    where status = 'published';
}
```

Key rules:
- No `@requires` on BrowseService — public access
- Always filter `status = 'published'` and `isDeleted = false` in BrowseService projections
- `AdminService` must have `@requires: 'admin'`

---

## Node.js Handlers (`srv/*.js`)

### Handler module skeleton

```js
const cds = require('@sap/cds')
const log = cds.log('admin-service')

module.exports = class AdminService extends cds.ApplicationService {
  async init() {
    const { ContentItems } = this.entities

    this.before('CREATE', ContentItems, this._setDefaults)
    this.before('UPDATE', ContentItems, this._validateStatusTransition)
    this.on('DELETE', ContentItems, this._softDelete)
    this.on('duplicateItem', this._duplicateItem)

    return super.init()
  }

  async _setDefaults(req) {
    req.data.status ??= 'draft'
  }

  async _validateStatusTransition(req) {
    const { ID, status } = req.data
    if (!status) return

    const item = await SELECT.one.from(req.subject)
    if (!item) return req.error(404, `ContentItem ${ID} not found`)

    const allowed = { draft: ['published'], published: ['archived'] }
    if (!allowed[item.status]?.includes(status)) {
      return req.error(400, `Invalid status transition: ${item.status} → ${status}`)
    }
  }

  async _softDelete(req) {
    const { ContentItems } = cds.entities('db')
    const n = await UPDATE(ContentItems)
      .set({ isDeleted: true })
      .where({ ID: req.params[0] })
    if (n === 0) return req.error(404, 'Not found')
    return req.reply()
  }

  async _duplicateItem(req) {
    const { itemID } = req.data
    const { ContentItems } = cds.entities('db')
    const original = await SELECT.one.from(ContentItems).where({ ID: itemID })
    if (!original) return req.error(404, 'ContentItem not found')

    const { ID, createdAt, createdBy, modifiedAt, modifiedBy, ...copy } = original
    copy.title = `Copy of ${copy.title}`
    copy.status = 'draft'

    const result = await INSERT.into(ContentItems).entries(copy)
    return result
  }
}
```

### Error handling

```js
// User-facing error with HTTP status
req.error(400, 'Message shown to user')
req.error(404, 'Not found')
req.error(409, 'Conflict')

// Reject inside a before handler — stops the operation
return req.reject(403, 'Forbidden')
```

### Database access (CDS QL)

```js
// Read
const items = await SELECT.from(ContentItems).where({ status: 'published' })
const item  = await SELECT.one.from(ContentItems, ID)

// Insert
await INSERT.into(ContentItems).entries({ title: '...', status: 'draft' })

// Update
await UPDATE(ContentItems, ID).with({ status: 'published' })

// Delete (avoid — use soft delete instead)
await DELETE.from(ContentItems).where({ ID })
```

### Current user

```js
const userId  = req.user.id          // e.g. 'admin@example.com'
const isAdmin = req.user.is('admin') // true/false
```

### Logging

```js
const log = cds.log('my-service')  // namespace for filtering
log.info('Processing item', { ID })
log.warn('Unexpected state', { status })
log.error('Failed', err)
```

---

## Testing (`test/`)

### Test file skeleton

```js
const cds = require('@sap/cds')
const { expect } = require('@jest/globals')

const TEST_USER = { username: 'admin', password: 'admin' }

describe('AdminService', () => {
  const { GET, POST, PATCH, DELETE } = cds.test().in(__dirname + '/..')

  it('rejects unauthenticated requests', async () => {
    const res = await GET('/odata/v4/admin/ContentItems')
    expect(res.status).toBe(401)
  })

  it('creates a content item', async () => {
    const res = await POST('/odata/v4/admin/ContentItems', {
      title: 'Test Item',
      url: 'https://example.com',
      type: 'article',
      summary: 'A test summary',
      status: 'draft'
    }, { auth: TEST_USER })
    expect(res.status).toBe(201)
    expect(res.data.ID).toBeDefined()
  })

  it('enforces status transition rules', async () => {
    // Create draft, then try invalid transition to archived
    // ...
  })
})
```

### Auth credentials for tests

Credentials come from `package.json` under `cds.requires.auth.users`.
Use `{ auth: { username, password } }` in request options.

---

## Mock Auth Config (`package.json`)

```json
{
  "cds": {
    "requires": {
      "auth": {
        "kind": "mocked",
        "users": {
          "admin": {
            "password": "admin",
            "roles": ["admin"]
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
| Using `console.log` | Use `cds.log('namespace')` |
| Raw SQL with `db.run()` | Use CDS QL: `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| Deleting ContentItem from DB | Set `isDeleted = true` |
| Putting logic in `.cds` files | Put in `.js` handler using `this.before/on/after` |
| Auth check in handler code | Use `@requires: 'admin'` in service CDS |
| Skipping `cds build` after model changes | Always run after changes to verify projections compile |
