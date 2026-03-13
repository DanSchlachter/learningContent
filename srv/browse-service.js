'use strict';

const cds = require('@sap/cds');

module.exports = class BrowseService extends cds.ApplicationService {
  async init() {

    const { ContentItems } = this.entities;

    // ── searchContent (unbound function) ─────────────────────────────────────
    this.on('searchContent', async (req) => {
      const { q, contentType, categoryId, tagId, fromDate, toDate } = req.data;

      let query = SELECT.from(ContentItems)
        .where({ status: 'published', isDeleted: false });

      if (q) {
        // CAP SQLite: use like-based search (no full FTS index on SQLite)
        query.where(`title like '%${q.replace(/'/g, "''")}%' or summary like '%${q.replace(/'/g, "''")}%'`);
      }

      if (contentType) {
        query.where({ contentType });
      }

      if (categoryId) {
        query.where({ category_ID: categoryId });
      }

      if (fromDate) {
        query.where('createdAt >=', fromDate);
      }

      if (toDate) {
        query.where('createdAt <=', toDate);
      }

      if (tagId) {
        // Use CQL exists path predicate on the 'tags' composition
        query.where(`exists tags[tag_ID = '${tagId.replace(/'/g, "''")}']`);
      }

      return cds.run(query);
    });

    return super.init();
  }
};
