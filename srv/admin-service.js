'use strict';

const cds = require('@sap/cds');

module.exports = class AdminService extends cds.ApplicationService {
  async init() {

    const { ContentItems } = this.entities;

    // ── changeStatus (bound action) ─────────────────────────────────────────
    this.on('changeStatus', ContentItems, async (req) => {
      const { newStatus } = req.data;
      const { ID } = req.params[0];

      const allowed = ['draft', 'published', 'archived'];
      if (!allowed.includes(newStatus)) {
        return req.error(400, `Invalid status: ${newStatus}`);
      }

      await UPDATE(ContentItems).set({ status: newStatus }).where({ ID });
      return SELECT.one(ContentItems).where({ ID });
    });

    // ── duplicate (bound action) ────────────────────────────────────────────
    this.on('duplicate', ContentItems, async (req) => {
      const { ID } = req.params[0];

      const original = await SELECT.one(ContentItems, ['*']).where({ ID });
      if (!original) return req.error(404, 'Content item not found');

      const { cds: { utils: { uuid } } } = require('@sap/cds');
      const newID = cds.utils.uuid();

      const copy = {
        ...original,
        ID:     newID,
        title:  `${original.title} (copy)`,
        status: 'draft',
        createdAt: undefined,
        createdBy: undefined,
        modifiedAt: undefined,
        modifiedBy: undefined,
      };
      delete copy.tags; // compositions are handled separately

      await INSERT.into(ContentItems).entries(copy);

      // Copy tag associations
      if (original.tags && original.tags.length > 0) {
        const { ContentItems_Tags } = this.entities;
        const tagCopies = original.tags.map(t => ({
          ID: cds.utils.uuid(),
          item_ID: newID,
          tag_ID: t.tag_ID,
        }));
        await INSERT.into(ContentItems_Tags).entries(tagCopies);
      }

      return SELECT.one(ContentItems).where({ ID: newID });
    });

    // ── bulkPublish ──────────────────────────────────────────────────────────
    this.on('bulkPublish', async (req) => {
      const { ids } = req.data;
      if (!ids || ids.length === 0) return 0;
      const result = await UPDATE(ContentItems)
        .set({ status: 'published' })
        .where({ ID: { in: ids } });
      return result;
    });

    // ── bulkArchive ──────────────────────────────────────────────────────────
    this.on('bulkArchive', async (req) => {
      const { ids } = req.data;
      if (!ids || ids.length === 0) return 0;
      const result = await UPDATE(ContentItems)
        .set({ status: 'archived' })
        .where({ ID: { in: ids } });
      return result;
    });

    // ── bulkDelete (soft delete) ─────────────────────────────────────────────
    this.on('bulkDelete', async (req) => {
      const { ids } = req.data;
      if (!ids || ids.length === 0) return 0;
      const result = await UPDATE(ContentItems)
        .set({ isDeleted: true })
        .where({ ID: { in: ids } });
      return result;
    });

    // ── bulkRecategorize ─────────────────────────────────────────────────────
    this.on('bulkRecategorize', async (req) => {
      const { ids, categoryId } = req.data;
      if (!ids || ids.length === 0) return 0;
      const result = await UPDATE(ContentItems)
        .set({ category_ID: categoryId })
        .where({ ID: { in: ids } });
      return result;
    });

    return super.init();
  }
};
