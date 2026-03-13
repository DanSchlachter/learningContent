'use strict';

const cds = require('@sap/cds');

const DB_ITEMS = 'learning.content.ContentItems';

module.exports = class AdminService extends cds.ApplicationService {
  async init() {

    const { ContentItems, ContentItems_Tags } = this.entities;

    // ── changeStatus (bound action) ─────────────────────────────────────────
    this.on('changeStatus', ContentItems, async (req) => {
      const { newStatus } = req.data;
      // req.params[0] is the plain UUID string when key is a single field
      const ID = req.params[0].ID ?? req.params[0];

      const allowed = ['draft', 'published', 'archived'];
      if (!allowed.includes(newStatus)) {
        return req.error(400, `Invalid status: ${newStatus}`);
      }

      const db = cds.services.db;
      await db.run(UPDATE.entity(DB_ITEMS).set({ status: newStatus }).where({ ID }));
      return db.run(SELECT.one.from(DB_ITEMS).where({ ID }));
    });

    // ── duplicate (bound action) ────────────────────────────────────────────
    this.on('duplicate', ContentItems, async (req) => {
      const ID = req.params[0].ID ?? req.params[0];

      const db = cds.services.db;
      const original = await db.run(SELECT.one.from(DB_ITEMS).where({ ID }));
      if (!original) return req.error(404, 'Content item not found');

      const newID = cds.utils.uuid();

      const copy = {
        ...original,
        ID:         newID,
        title:      `${original.title} (copy)`,
        status:     'draft',
        createdAt:  undefined,
        createdBy:  undefined,
        modifiedAt: undefined,
        modifiedBy: undefined,
      };
      delete copy.tags; // compositions handled separately

      await db.run(INSERT.into(DB_ITEMS).entries(copy));

      return db.run(SELECT.one.from(DB_ITEMS).where({ ID: newID }));
    });

    // ── bulkPublish ──────────────────────────────────────────────────────────
    this.on('bulkPublish', async (req) => {
      const { ids } = req.data;
      if (!ids || ids.length === 0) return 0;
      return UPDATE(ContentItems).set({ status: 'published' }).where({ ID: { in: ids } });
    });

    // ── bulkArchive ──────────────────────────────────────────────────────────
    this.on('bulkArchive', async (req) => {
      const { ids } = req.data;
      if (!ids || ids.length === 0) return 0;
      return UPDATE(ContentItems).set({ status: 'archived' }).where({ ID: { in: ids } });
    });

    // ── bulkDelete (soft delete) ─────────────────────────────────────────────
    this.on('bulkDelete', async (req) => {
      const { ids } = req.data;
      if (!ids || ids.length === 0) return 0;
      return UPDATE(ContentItems).set({ isDeleted: true }).where({ ID: { in: ids } });
    });

    // ── bulkRecategorize ─────────────────────────────────────────────────────
    this.on('bulkRecategorize', async (req) => {
      const { ids, categoryId } = req.data;
      if (!ids || ids.length === 0) return 0;
      return UPDATE(ContentItems).set({ category_ID: categoryId }).where({ ID: { in: ids } });
    });

    return super.init();
  }
};
