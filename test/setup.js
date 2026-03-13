'use strict';
// Force CDS to use the [test] profile — in-memory SQLite, isolated from db.sqlite
process.env.CDS_ENV = 'test';
