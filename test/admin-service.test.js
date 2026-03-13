'use strict';

const cds = require('@sap/cds');
const app = cds.test(__dirname + '/..');
const { GET, POST, PUT, DELETE } = app;

beforeAll(app.data.reset);

const ADMIN  = { auth: { username: 'alice', password: 'alice' } };
const ADMIN2 = { auth: { username: 'bob',   password: 'bob'   } };
const VIEWER = { auth: { username: 'carol', password: 'carol' } };

const BASE = '/odata/v4/admin';

// Known seed data IDs
const ITEM_1        = '30000000-0000-0000-0000-000000000001'; // "Getting Started with SAP CAP" published
const ITEM_2        = '30000000-0000-0000-0000-000000000002'; // "SAP BTP Architecture Overview" published
const ITEM_3        = '30000000-0000-0000-0000-000000000003'; // "Kubernetes for Developers" published
const ITEM_DRAFT    = '30000000-0000-0000-0000-000000000010'; // "CAP Advanced Patterns (Draft)"
const CAT_1         = '10000000-0000-0000-0000-000000000001'; // "Cloud & Infrastructure"
const CAT_2         = '10000000-0000-0000-0000-000000000002'; // "Cloud Native"
const TAG_1         = '20000000-0000-0000-0000-000000000001'; // "SAP BTP"

// Helper: key predicate for ContentItems
const key = (id) => `(ID=${id})`;

describe('AdminService', () => {

  // ── Authentication ──────────────────────────────────────────────────────────

  describe('Authentication', () => {

    test('unauthenticated request returns 401', async () => {
      await expect(GET(`${BASE}/ContentItems`))
        .rejects.toMatchObject({ response: { status: 401 } });
    });

    test('viewer (no Admin role) returns 403', async () => {
      await expect(GET(`${BASE}/ContentItems`, VIEWER))
        .rejects.toMatchObject({ response: { status: 403 } });
    });

    test('admin user (alice) can read ContentItems', async () => {
      const { data, status } = await GET(`${BASE}/ContentItems?$select=ID,title`, ADMIN);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
    });

    test('admin user (bob) can also read ContentItems', async () => {
      const { data, status } = await GET(`${BASE}/ContentItems?$select=ID,title`, ADMIN2);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
    });

  });

  // ── ContentItems — Read ─────────────────────────────────────────────────────

  describe('ContentItems — Read', () => {

    test('returns all items including draft and soft-deleted', async () => {
      const { data } = await GET(`${BASE}/ContentItems?$select=ID,status,isDeleted`, ADMIN);
      const statuses = new Set(data.value.map(v => v.status));
      // Should have at least published AND draft items visible to admin
      expect(statuses.has('published')).toBe(true);
      expect(statuses.has('draft')).toBe(true);
    });

    test('can read a single item by key', async () => {
      const { data, status } = await GET(`${BASE}/ContentItems${key(ITEM_1)}?$select=ID,title`, ADMIN);
      expect(status).toBe(200);
      expect(data.ID).toBe(ITEM_1);
    });

    test('supports $filter', async () => {
      const { data } = await GET(`${BASE}/ContentItems?$filter=status eq 'draft'&$select=ID,status`, ADMIN);
      expect(data.value.length).toBeGreaterThan(0);
      for (const item of data.value) {
        expect(item.status).toBe('draft');
      }
    });

    test('supports $orderby', async () => {
      const { data } = await GET(`${BASE}/ContentItems?$orderby=title asc&$select=title`, ADMIN);
      const titles = data.value.map(v => v.title);
      expect(titles).toEqual([...titles].sort());
    });

  });

  // ── ContentItems — Create & Delete ──────────────────────────────────────────

  describe('ContentItems — Create & Delete', () => {
    let createdID;

    test('admin can create a new ContentItem', async () => {
      const { data, status } = await POST(`${BASE}/ContentItems`, {
        title: 'Test Item',
        url: 'https://example.com/test',
        contentType: 'article',
        summary: 'A test content item created by automated tests.',
        status: 'draft',
        category_ID: CAT_1,
      }, ADMIN);
      expect(status).toBe(201);
      expect(data.ID).toBeTruthy();
      expect(data.title).toBe('Test Item');
      expect(data.status).toBe('draft');
      createdID = data.ID;
    });

    test('created item is visible in admin list', async () => {
      const { data } = await GET(
        `${BASE}/ContentItems?$filter=ID eq ${createdID}&$select=ID,title`, ADMIN
      );
      expect(data.value).toHaveLength(1);
      expect(data.value[0].title).toBe('Test Item');
    });

    test('created draft item is NOT visible in browse service', async () => {
      const { data } = await GET(
        `/odata/v4/browse/ContentItems?$filter=ID eq ${createdID}&$select=ID`
      );
      expect(data.value).toHaveLength(0);
    });

    test('admin can delete (soft-delete via PATCH isDeleted) a ContentItem', async () => {
      // Use bulkDelete to soft-delete the created item
      const { data, status } = await POST(`${BASE}/bulkDelete`, { ids: [createdID] }, ADMIN);
      expect(status).toBe(200);
      expect(data.value).toBe(1);
    });

    test('soft-deleted item has isDeleted=true', async () => {
      const { data } = await GET(
        `${BASE}/ContentItems?$filter=ID eq ${createdID}&$select=ID,isDeleted`, ADMIN
      );
      expect(data.value[0].isDeleted).toBe(true);
    });

  });

  // ── Taxonomy ────────────────────────────────────────────────────────────────

  describe('Categories', () => {
    let newCatID;

    test('admin can read categories', async () => {
      const { data, status } = await GET(`${BASE}/Categories?$select=ID,name`, ADMIN);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
    });

    test('admin can create a category', async () => {
      const { data, status } = await POST(`${BASE}/Categories`, {
        name: 'Test Category',
        slug: 'test-category',
      }, ADMIN);
      expect(status).toBe(201);
      expect(data.name).toBe('Test Category');
      newCatID = data.ID;
    });

    test('admin can delete the created category', async () => {
      const { status } = await DELETE(`${BASE}/Categories(${newCatID})`, ADMIN);
      expect(status).toBe(204);
    });

  });

  describe('Tags', () => {
    let newTagID;

    test('admin can create a tag', async () => {
      const { data, status } = await POST(`${BASE}/Tags`, {
        name: 'Test Tag',
        slug: 'test-tag',
      }, ADMIN);
      expect(status).toBe(201);
      newTagID = data.ID;
    });

    test('admin can delete the created tag', async () => {
      const { status } = await DELETE(`${BASE}/Tags(${newTagID})`, ADMIN);
      expect(status).toBe(204);
    });

  });

  // ── Bound actions ───────────────────────────────────────────────────────────

  describe('changeStatus (bound action)', () => {

    test('changes a published item to archived', async () => {
      const { status } = await POST(
        `${BASE}/ContentItems${key(ITEM_1)}/AdminService.changeStatus`,
        { newStatus: 'archived' }, ADMIN
      );
      expect(status).toBe(200);
      // Verify via GET
      const { data } = await GET(`${BASE}/ContentItems?$filter=ID eq ${ITEM_1}&$select=ID,status`, ADMIN);
      expect(data.value[0].status).toBe('archived');
    });

    test('changes it back to published', async () => {
      await POST(`${BASE}/ContentItems${key(ITEM_1)}/AdminService.changeStatus`,
        { newStatus: 'archived' }, ADMIN);
      const { status } = await POST(
        `${BASE}/ContentItems${key(ITEM_1)}/AdminService.changeStatus`,
        { newStatus: 'published' }, ADMIN
      );
      expect(status).toBe(200);
      const { data } = await GET(`${BASE}/ContentItems?$filter=ID eq ${ITEM_1}&$select=ID,status`, ADMIN);
      expect(data.value[0].status).toBe('published');
    });

    test('rejects an invalid status value', async () => {
      await expect(
        POST(`${BASE}/ContentItems${key(ITEM_1)}/AdminService.changeStatus`,
          { newStatus: 'invalid_status' }, ADMIN)
      ).rejects.toMatchObject({ response: { status: 400 } });
    });

  });

  describe('duplicate (bound action)', () => {
    let copyID;

    test('creates a draft copy of a published item', async () => {
      const { data, status } = await POST(
        `${BASE}/ContentItems${key(ITEM_2)}/AdminService.duplicate`,
        {}, ADMIN
      );
      expect(status).toBe(200);
      expect(data.title).toContain('(copy)');
      expect(data.status).toBe('draft');
      expect(data.ID).not.toBe(ITEM_2);
      copyID = data.ID;
    });

    test('duplicate is visible in admin', async () => {
      const { data } = await GET(
        `${BASE}/ContentItems?$filter=ID eq ${copyID}&$select=ID,title,status`, ADMIN
      );
      expect(data.value).toHaveLength(1);
      expect(data.value[0].status).toBe('draft');
    });

    test('duplicate is NOT visible in browse (draft)', async () => {
      const { data } = await GET(
        `/odata/v4/browse/ContentItems?$filter=ID eq ${copyID}&$select=ID`
      );
      expect(data.value).toHaveLength(0);
    });

    // Clean up the copy
    afterAll(async () => {
      if (copyID) {
        await POST(`${BASE}/bulkDelete`, { ids: [copyID] }, ADMIN);
      }
    });

  });

  // ── Bulk actions ─────────────────────────────────────────────────────────────

  describe('bulkPublish', () => {

    test('publishes a draft item and returns count', async () => {
      // First ensure item is draft
      await POST(`${BASE}/ContentItems${key(ITEM_DRAFT)}/AdminService.changeStatus`,
        { newStatus: 'draft' }, ADMIN);

      const { data, status } = await POST(`${BASE}/bulkPublish`, { ids: [ITEM_DRAFT] }, ADMIN);
      expect(status).toBe(200);
      expect(data.value).toBe(1);
    });

    test('published item becomes visible in browse', async () => {
      const { data } = await GET(
        `/odata/v4/browse/ContentItems?$filter=ID eq ${ITEM_DRAFT}&$select=ID,status`
      );
      expect(data.value).toHaveLength(1);
      expect(data.value[0].status).toBe('published');
    });

    test('returns 0 for empty ids array', async () => {
      const { data } = await POST(`${BASE}/bulkPublish`, { ids: [] }, ADMIN);
      expect(data.value).toBe(0);
    });

    // Restore item back to draft after tests
    afterAll(async () => {
      await POST(`${BASE}/ContentItems${key(ITEM_DRAFT)}/AdminService.changeStatus`,
        { newStatus: 'draft' }, ADMIN);
    });

  });

  describe('bulkArchive', () => {

    test('archives selected items and returns count', async () => {
      const { data, status } = await POST(`${BASE}/bulkArchive`, { ids: [ITEM_3] }, ADMIN);
      expect(status).toBe(200);
      expect(data.value).toBe(1);
    });

    test('archived item disappears from browse list', async () => {
      const { data } = await GET(
        `/odata/v4/browse/ContentItems?$filter=ID eq ${ITEM_3}&$select=ID,status`
      );
      expect(data.value).toHaveLength(0);
    });

    test('archived item still visible in admin', async () => {
      const { data } = await GET(
        `${BASE}/ContentItems?$filter=ID eq ${ITEM_3}&$select=ID,status`, ADMIN
      );
      expect(data.value[0].status).toBe('archived');
    });

    // Restore
    afterAll(async () => {
      await POST(`${BASE}/ContentItems${key(ITEM_3)}/AdminService.changeStatus`,
        { newStatus: 'published' }, ADMIN);
    });

  });

  describe('bulkDelete (soft delete)', () => {
    let tempID;

    beforeAll(async () => {
      // Create a throwaway item to delete
      const { data } = await POST(`${BASE}/ContentItems`, {
        title: 'Temp Delete Target',
        url: 'https://example.com/temp',
        contentType: 'article',
        summary: 'Temporary item for bulk delete test.',
        status: 'draft',
        category_ID: CAT_1,
      }, ADMIN);
      tempID = data.ID;
    });

    test('soft-deletes selected items and returns count', async () => {
      const { data, status } = await POST(`${BASE}/bulkDelete`, { ids: [tempID] }, ADMIN);
      expect(status).toBe(200);
      expect(data.value).toBe(1);
    });

    test('soft-deleted item has isDeleted=true in admin', async () => {
      const { data } = await GET(
        `${BASE}/ContentItems?$filter=ID eq ${tempID}&$select=ID,isDeleted`, ADMIN
      );
      expect(data.value[0].isDeleted).toBe(true);
    });

    test('soft-deleted item is absent from browse', async () => {
      const { data } = await GET(
        `/odata/v4/browse/ContentItems?$filter=ID eq ${tempID}&$select=ID`
      );
      expect(data.value).toHaveLength(0);
    });

  });

  describe('bulkRecategorize', () => {

    test('moves selected items to a new category and returns count', async () => {
      const { data, status } = await POST(`${BASE}/bulkRecategorize`,
        { ids: [ITEM_1], categoryId: CAT_2 }, ADMIN);
      expect(status).toBe(200);
      expect(data.value).toBe(1);
    });

    test('item now has the new category', async () => {
      const { data } = await GET(
        `${BASE}/ContentItems?$filter=ID eq ${ITEM_1}&$select=ID,category_ID`, ADMIN
      );
      expect(data.value[0].category_ID).toBe(CAT_2);
    });

    // Restore
    afterAll(async () => {
      await POST(`${BASE}/bulkRecategorize`,
        { ids: [ITEM_1], categoryId: '10000000-0000-0000-0000-000000000008' }, ADMIN);
    });

  });

  // ── LearningPaths ────────────────────────────────────────────────────────────

  describe('LearningPaths', () => {

    test('admin can read learning paths', async () => {
      const { data, status } = await GET(`${BASE}/LearningPaths?$select=ID,title,status`, ADMIN);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
    });

  });

  // ── AdminUsers ──────────────────────────────────────────────────────────────

  describe('AdminUsers', () => {

    test('admin can read admin users', async () => {
      const { data, status } = await GET(`${BASE}/AdminUsers?$select=ID,email,status`, ADMIN);
      expect(status).toBe(200);
      expect(data.value.length).toBeGreaterThan(0);
    });

    test('admin users list contains expected fields', async () => {
      const { data } = await GET(`${BASE}/AdminUsers`, ADMIN);
      const user = data.value[0];
      expect(user).toHaveProperty('ID');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('status');
    });

  });

});
