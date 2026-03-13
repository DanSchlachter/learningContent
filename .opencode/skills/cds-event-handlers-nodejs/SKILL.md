---
name: cds-event-handlers-nodejs
description: SAP CAP Node.js service event handlers - before/on/after hooks, req object, error handling, transactions, custom actions
license: MIT
compatibility: opencode
metadata:
  topic: SAP CAP
  runtime: Node.js
---

## What I do

Guide you in implementing CAP Node.js service handlers, covering:

- `before` / `on` / `after` handler registration
- The `req` object: `req.data`, `req.user`, `req.subject`, `req.error()`, `req.reject()`
- Class-based (`cds.ApplicationService`) vs. function-based handlers
- Wildcard handler patterns
- Custom actions and functions
- `req.before('commit')` hook for pre-commit validation
- `cds.context` and transaction management
- Observing other services with `cds.connect.to`
- Emitting events with `srv.emit`
- Error and rejection patterns

## Rules

- ALWAYS check `cds-mcp_search_model` for service/entity definitions before writing handlers.
- ALWAYS verify API usage with `cds-mcp_search_docs` before using unfamiliar CAP Node.js APIs.
- Handler files must be co-located with the service CDS file and share the same base name (e.g., `cat-service.js` for `cat-service.cds`).
- Prefer the class-based `cds.ApplicationService` pattern for new services; function-based exports are also supported.
- Use `req.reject(status, message)` to return HTTP errors to the client; use `req.error()` to accumulate multiple validation errors.
- Never `throw` plain errors for expected business validation — use `req.reject()` instead.
- Avoid `await` inside `cds.on('served', ...)` — it causes race conditions in handler registration.
- Do not store per-request state in module-level variables; use handler scope or `cds.context`.
- Use `req.before('commit')` for final validations that need DB reads before committing.
- Call `next()` or `return next()` to delegate to the next handler in the chain (for `on` handlers).

## Common Patterns

### Class-based service implementation
```js
const cds = require('@sap/cds')

module.exports = class CatalogService extends cds.ApplicationService {
  async init() {
    const { Books } = this.entities

    // Validate before update
    this.before('UPDATE', Books, req => {
      if (req.data.stock < 0) req.reject(400, 'Stock cannot be negative')
    })

    // Post-process read results
    this.after('READ', Books, books => {
      for (const book of books) book.title = book.title?.toUpperCase()
    })

    // Custom action handler
    this.on('submitOrder', async req => {
      const { book, quantity } = req.data
      await UPDATE(Books).where({ ID: book }).with({ stock: { '-=': quantity } })
      await this.emit('OrderSubmitted', { book, quantity })
    })

    return super.init()
  }
}
```

### Function-based export
```js
module.exports = async function (srv) {
  const { Books } = srv.entities

  srv.before('CREATE', Books, req => {
    if (!req.data.title) req.reject(400, 'Title is required')
  })

  srv.on('READ', Books, async (req, next) => {
    // custom pre-processing, then delegate to default handler
    return next()
  })
}
```

### Wildcard patterns
```js
this.before('READ', '*', req => { /* all READ requests in this service */ })
this.before('*', 'Books', req => { /* all events on Books */ })
this.before('*', req => { /* all events in this service */ })
```

### req object quick reference
```js
srv.on('CREATE', Orders, async req => {
  req.data           // payload sent by client
  req.user.id        // authenticated user ID
  req.user.is('admin')  // role check
  req.tenant         // tenant ID (multitenancy)
  req.locale         // normalized locale string
  req.subject        // entity reference for bound actions
  req.params         // key values from URL path

  // Error handling
  req.reject(409, 'Duplicate order')          // throw HTTP error
  req.error(400, 'Field X is invalid')        // accumulate error
  req.error(400, 'Field Y is also invalid')   // multiple errors → MULTIPLE_ERRORS
})
```

### Pre-commit hook
```js
srv.before('CREATE', Orders, function (req) {
  req.before('commit', async () => {
    const { creditscore } = await SELECT.one.from(Customers)
      .where({ ID: req.data.customer_ID })
    if (creditscore < 100) throw new Error('Credit check failed')
  })
})
```

### Observing another service
```js
module.exports = class ReviewsService extends cds.ApplicationService {
  async init() {
    const catalog = await cds.connect.to('CatalogService')
    catalog.on('OrderSubmitted', async msg => {
      const { book, quantity } = msg.data
      // react to the event
    })
    return super.init()
  }
}
```

### Safely attaching to db after bootstrap
```js
// Do NOT use async/await inside cds.on('served')
cds.on('served', () => {
  const { db } = cds.services
  db.before('*', req => console.log(req.event, req.path))
})
```

### Accessing HTTP request/response
```js
srv.on('READ', Books, req => {
  const { req: httpReq, res: httpRes } = cds.context.http
  const myHeader = httpReq.headers['x-custom-header']
})
```

## Handler Execution Order
```
before → on → after → commit
```
- `before`: validation, input manipulation
- `on`: core business logic; call `next()` to delegate to generic handler
- `after`: post-processing of results (receives result rows directly)
- `req.before('commit')`: final checks just before DB transaction commits

## File Naming Convention
```
srv/
  cat-service.cds   ← service definition
  cat-service.js    ← handler (auto-loaded by CAP)
```
