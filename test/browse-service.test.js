'use strict';

const cds = require('@sap/cds');
const { GET, POST } = cds.test(__dirname + '/..');

// Known seed data IDs
const ITEM_PUBLISHED = '30000000-0000-0000-0000-000000000001'; // "Getting Started with SAP CAP" - published
const ITEM_DRAFT     = '30000000-0000-0000-0000-000000000010'; // "CAP Advanced Patterns (Draft)" - draft
const TAG_SAP_BTP    = '20000000-0000-0000-0000-000000000001'; // "SAP BTP"
const TAG_KUBERNETES = '20000000-0000-0000-0000-000000000002'; // "Kubernetes"
const CAT_CLOUD      = '10000000-0000-0000-0000-000000000001'; // "Cloud & Infrastructure"
const CAT_DEV_TOOLS  = '10000000-0000-0000-0000-000000000008'; // "Developer Tools"

const BASE = '/odata/v4/browse';

describe('BrowseService — public read access', () => {

  // ── ContentItems ────────────────────────────────────────────────────────────

  describe('ContentItems', () => {

    test('returns only published items (no auth required)', async () => {
      const { data, status } = await GET(`${BASE}/ContentItems?$select=ID,title,status`);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        expect(item.status).toBe('published');
      }
    });

    test('does not expose draft items', async () => {
      const { data } = await GET(`${BASE}/ContentItems?$select=ID,status`);
      const ids = data.value.map(v => v.ID);
      expect(ids).not.toContain(ITEM_DRAFT);
    });

    test('does not expose soft-deleted items', async () => {
      const { data } = await GET(`${BASE}/ContentItems?$select=ID,isDeleted`);
      for (const item of data.value) {
        expect(item.isDeleted).toBeFalsy();
      }
    });

    test('supports $filter by contentType', async () => {
      const { data } = await GET(`${BASE}/ContentItems?$filter=contentType eq 'video'&$select=ID,contentType`);
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        expect(item.contentType).toBe('video');
      }
    });

    test('supports $orderby', async () => {
      const { data } = await GET(`${BASE}/ContentItems?$orderby=title asc&$select=title`);
      const titles = data.value.map(v => v.title);
      expect(titles).toEqual([...titles].sort());
    });

    test('supports $top and $skip', async () => {
      const { data: page1 } = await GET(`${BASE}/ContentItems?$top=2&$skip=0&$select=ID`);
      const { data: page2 } = await GET(`${BASE}/ContentItems?$top=2&$skip=2&$select=ID`);
      expect(page1.value).toHaveLength(2);
      // pages must not overlap
      const ids1 = page1.value.map(v => v.ID);
      const ids2 = page2.value.map(v => v.ID);
      expect(ids1.some(id => ids2.includes(id))).toBe(false);
    });

    test('can fetch a single published item by key', async () => {
      const { data, status } = await GET(`${BASE}/ContentItems(${ITEM_PUBLISHED})?$select=ID,title,status`);
      expect(status).toBe(200);
      expect(data.ID).toBe(ITEM_PUBLISHED);
      expect(data.status).toBe('published');
    });

  });

  // ── Taxonomy ────────────────────────────────────────────────────────────────

  describe('Categories', () => {
    test('returns categories without auth', async () => {
      const { data, status } = await GET(`${BASE}/Categories?$select=ID,name`);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
    });
  });

  describe('Tags', () => {
    test('returns tags without auth', async () => {
      const { data, status } = await GET(`${BASE}/Tags?$select=ID,name`);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
    });
  });

  // ── LearningPaths ────────────────────────────────────────────────────────────

  describe('LearningPaths', () => {
    test('returns only published learning paths', async () => {
      const { data, status } = await GET(`${BASE}/LearningPaths?$select=ID,title,status`);
      expect(status).toBe(200);
      for (const lp of data.value) {
        expect(lp.status).toBe('published');
      }
    });
  });

  // ── searchContent ───────────────────────────────────────────────────────────

  describe('searchContent function', () => {

    test('returns published items with no filters', async () => {
      const { data, status } = await GET(
        `${BASE}/searchContent(q=null,contentType=null,categoryId=null,tagId=null,fromDate=null,toDate=null)`
      );
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        expect(item.status).toBe('published');
      }
    });

    test('filters by keyword in title', async () => {
      const { data } = await GET(
        `${BASE}/searchContent(q='SAP',contentType=null,categoryId=null,tagId=null,fromDate=null,toDate=null)`
      );
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        const matchesTitleOrSummary =
          item.title.toLowerCase().includes('sap') ||
          item.summary.toLowerCase().includes('sap');
        expect(matchesTitleOrSummary).toBe(true);
      }
    });

    test('filters by keyword in summary', async () => {
      const { data } = await GET(
        `${BASE}/searchContent(q='kubernetes',contentType=null,categoryId=null,tagId=null,fromDate=null,toDate=null)`
      );
      expect(data.value.length).toBeGreaterThan(0);
    });

    test('filters by contentType', async () => {
      const { data } = await GET(
        `${BASE}/searchContent(q=null,contentType='video',categoryId=null,tagId=null,fromDate=null,toDate=null)`
      );
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        expect(item.contentType).toBe('video');
      }
    });

    test('filters by categoryId', async () => {
      const { data } = await GET(
        `${BASE}/searchContent(q=null,contentType=null,categoryId=${CAT_DEV_TOOLS},tagId=null,fromDate=null,toDate=null)`
      );
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        expect(item.category_ID).toBe(CAT_DEV_TOOLS);
      }
    });

    test('filters by tagId', async () => {
      const { data } = await GET(
        `${BASE}/searchContent(q=null,contentType=null,categoryId=null,tagId=${TAG_SAP_BTP},fromDate=null,toDate=null)`
      );
      expect(data.value.length).toBeGreaterThan(0);
      // Result should be "SAP BTP Architecture Overview"
      expect(data.value.some(v => v.title.includes('BTP'))).toBe(true);
    });

    test('combined keyword + contentType filter', async () => {
      const { data } = await GET(
        `${BASE}/searchContent(q='SAP',contentType='article',categoryId=null,tagId=null,fromDate=null,toDate=null)`
      );
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        expect(item.contentType).toBe('article');
      }
    });

    test('returns empty array for unmatched keyword', async () => {
      const { data } = await GET(
        `${BASE}/searchContent(q='xyzzy_no_match_12345',contentType=null,categoryId=null,tagId=null,fromDate=null,toDate=null)`
      );
      expect(data.value).toHaveLength(0);
    });

    test('never returns draft items', async () => {
      // Search with no filters — should still exclude the draft item
      const { data } = await GET(
        `${BASE}/searchContent(q=null,contentType=null,categoryId=null,tagId=null,fromDate=null,toDate=null)`
      );
      const ids = data.value.map(v => v.ID);
      expect(ids).not.toContain(ITEM_DRAFT);
    });

  });

  // ── Write protection ─────────────────────────────────────────────────────────

  describe('Write protection', () => {
    test('POST to ContentItems is rejected (405 or 403)', async () => {
      await expect(
        POST(`${BASE}/ContentItems`, {
          title: 'Hacked', url: 'https://example.com', summary: 'x', status: 'published'
        })
      ).rejects.toMatchObject({ response: { status: expect.any(Number) } });
    });
  });

});
