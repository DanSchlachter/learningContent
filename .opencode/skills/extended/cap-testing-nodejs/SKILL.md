---
name: cap-testing-nodejs
description: >
  SAP CAP Node.js testing with cds.test — installing @cap-js/cds-test, starting a
  test server, HTTP helpers (GET/POST/PATCH/DELETE), mocked auth, chai assertions,
  log capture, best practices, Jest and Mocha compatibility.
compatibility:
  runtime: [nodejs]
metadata:
  topics:
    - "@cap-js/cds-test install"
    - cds.test() server startup
    - GET / POST / PATCH / DELETE helpers
    - mocked authentication in tests
    - chai expect / assert / should
    - chai-subset / chai-as-promised
    - cds.test.log() capture
    - Jest vs Mocha
    - best practices (assert data before status)
---

# CAP Node.js Testing with `cds.test`

## What This Skill Covers

Writing automated tests for CAP Node.js services using the `@cap-js/cds-test` package —
spinning up a test server, calling OData endpoints over HTTP, and asserting responses.

## Rules

1. **Always** call `cds-mcp_search_docs` before writing tests to verify the current `cds.test` API.
2. **Always** call `cds-mcp_search_model` to confirm service paths and entity names before building test URLs.
3. Assert on **response data first**, then on status codes — this gives more informative failure messages.
4. Use minimal regex assertions for error messages (e.g. `/readonly/i`) instead of exact strings.
5. Always configure mocked auth (`kind: mocked`) in the development profile before running authenticated tests.

---

## Installation

```shell
# Install the test package (bundles chai, axios, chai-subset, chai-as-promised)
npm add -D @cap-js/cds-test

# Remove previously separate test deps (if upgrading from older setup)
npm rm axios chai chai-subset chai-as-promised
```

---

## Starting a Test Server

```javascript
// test/catalog.test.js
const cds = require('@sap/cds')

describe('CatalogService', () => {
  // Starts server before all tests; shuts down after
  const { GET, POST, PATCH, DELETE, expect } = cds.test(__dirname + '/..')

  // tests go here ...
})
```

`cds.test(path)` launches the CAP server in a `beforeAll` hook and tears it down in
`afterAll` automatically. Works with both **Jest** and **Mocha**.

---

## HTTP Helpers

All helpers are pre-bound to the running server's base URL.

```javascript
describe('Books', () => {
  const { GET, POST, PATCH, DELETE, expect } = cds.test(__dirname + '/..')

  it('reads all books', async () => {
    const { data } = await GET('/browse/Books')
    expect(data.value).to.be.an('array')
    expect(data.value.length).to.be.greaterThan(0)
  })

  it('reads a single book', async () => {
    const { data } = await GET('/browse/Books(201)')
    expect(data).to.containSubset({ ID: 201 })
  })

  it('filters books', async () => {
    const { data } = await GET("/browse/Books?$filter=stock gt 0&$select=ID,title")
    expect(data.value).to.be.an('array')
  })

  it('creates a book (admin)', async () => {
    const { status } = await POST('/admin/Books',
      { ID: 999, title: 'Test Book', stock: 10 },
      { auth: { username: 'alice', password: '' } }
    )
    expect(status).to.equal(201)
  })

  it('updates a book', async () => {
    await PATCH('/admin/Books(999)',
      { stock: 5 },
      { auth: { username: 'alice', password: '' } }
    )
  })

  it('deletes a book', async () => {
    await DELETE('/admin/Books(999)',
      { auth: { username: 'alice', password: '' } }
    )
  })
})
```

### Tagged template style

```javascript
const { data } = await GET`/browse/Books`
```

---

## Mocked Authentication

Configure `kind: mocked` in `package.json` (development profile) before running tests:

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[development]": {
          "kind": "mocked",
          "users": {
            "alice": { "roles": ["admin"] },
            "bob":   { "roles": ["viewer"] }
          }
        }
      }
    }
  }
}
```

Then in tests:

```javascript
// Pass credentials via auth option
await GET('/admin/Books', { auth: { username: 'alice', password: '' } })

// Test that anonymous access is rejected
await expect(GET('/admin/Books')).to.be.rejectedWith(/401/)
```

---

## Chai Assertions

`cds.test()` returns pre-configured chai styles:

```javascript
const { expect, assert, should } = cds.test(__dirname + '/..')

// expect style
expect(data.value).to.have.length.greaterThan(0)
expect(data.value[0]).to.containSubset({ title: 'Poems' })

// assert style
assert.isArray(data.value)
assert.equal(data.value[0].ID, 201)

// should style (adds .should to all objects)
data.value.should.be.an('array')
```

### Async rejections with `chai-as-promised`

```javascript
// Expect a POST to a read-only entity to be rejected
await expect(
  POST('/browse/Books', { ID: 999, title: 'X' })
).to.be.rejectedWith(/readonly/i)

// Check status code explicitly if needed
try {
  await POST('/browse/Books', { ID: 999 })
} catch (e) {
  expect(e.response.status).to.equal(403)
}
```

---

## Log Capture

```javascript
describe('logging', () => {
  const test = cds.test(__dirname + '/..')
  let log = test.log()          // captures console output in scope

  it('emits a log on read', async () => {
    await GET('/browse/Books')
    expect(log.output).to.contain('Books')
  })

  it('log.clear() resets captured output', () => {
    log.clear()
    expect(log.output).to.equal('')
  })
})
```

---

## Best Practices

```javascript
// GOOD: assert data first, status last (better failure messages)
const { data, status } = await GET('/browse/Books')
expect(data.value).to.be.an('array').with.length.greaterThan(0)
expect(status).to.equal(200)

// BAD: asserting status first (obscures what actually went wrong)
// expect(status).to.equal(200)
// expect(data.value).to.be.an('array')

// GOOD: minimal regex for error messages (resilient to minor wording changes)
await expect(POST('/browse/Books', {})).to.be.rejectedWith(/readonly/i)

// BAD: exact string match (brittle)
// await expect(POST(...)).to.be.rejectedWith('Entity is read-only')
```

---

## Running Tests

```shell
# Jest
npx jest

# Mocha
npx mocha test/**/*.test.js

# npm scripts (add to package.json)
# "test": "jest"   or   "test": "mocha"
npm test
```

---

## Quick Reference

| Task | Code |
|---|---|
| Install | `npm add -D @cap-js/cds-test` |
| Start server | `cds.test(__dirname + '/..')` |
| GET request | `await GET('/path')` |
| POST with body | `await POST('/path', data)` |
| Authenticated | `{ auth: { username: 'alice', password: '' } }` |
| Assert subset | `expect(obj).to.containSubset({...})` |
| Assert rejection | `await expect(GET(...)).to.be.rejectedWith(/pattern/)` |
| Capture logs | `test.log()` (where `test = cds.test(...)`) |
