# Learning Content Management — Web Application Specification

## 1. Overview

A web application that enables a corporate Learning & Development team to curate and publish a collection of links to external learning resources, and allows learners to browse, search, and navigate to that content. No content is hosted by the application itself — only metadata (title, description, URL, and taxonomy) is stored.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Admin** | Creates, edits, organizes, and deletes all content entries. Manages taxonomy (categories, tags). Must be authenticated. |
| **Viewer** | Browses, searches, and views published content entries. No login required. No edit capabilities. |

The viewer-facing site is publicly accessible — no authentication is required to browse or navigate to content. Authentication is required only to access the admin interface.

---

## 3. Functional Requirements

### 3.1 Content Management (Admin)

#### 3.1.1 Content Types

Each entry is a link to an external resource. The type is a classification label that helps viewers filter and understand what they will find at the link:

| Type | Description |
|---|---|
| **Video** | Link to an external video (e.g. YouTube, Vimeo, internal streaming platform) |
| **Article** | Link to a written guide, blog post, or documentation page |
| **Course** | Link to a full course on an external platform (e.g. Coursera, LinkedIn Learning) |
| **File / Document** | Link to a downloadable document (PDF, slide deck, etc.) hosted externally |

#### 3.1.2 Content Item Fields

Every content entry must have:

- **Title** (required)
- **URL** (required — the external link)
- **Content Type** (Video, Article, Course, File / Document)
- **Summary** (required, plain text — a short description written by the admin)
- **Category** (single, required — see §3.3)
- **Tags** (multiple, optional)
- **Status** (`Draft` | `Published` | `Archived`)
- **Thumbnail / Cover image URL** (optional — link to an image, not an upload)
- **Author / Source** (optional — e.g. "SAP Learning", "Martin Fowler")
- **Duration** (optional — estimated reading or viewing time, free text e.g. "45 min")
- **Created by** (auto-filled)
- **Created at / Updated at** (auto-filled timestamps)

#### 3.1.3 Content Operations

- Create new content entry
- Edit existing content entry
- Duplicate a content entry
- Change status (`Draft` → `Published` → `Archived`)
  - `Draft`: visible to admins only
  - `Published`: visible to all viewers
  - `Archived`: no longer listed in browse or search results, but still accessible via direct URL
- Delete content entry (soft delete; recoverable by admin)
- Bulk operations: publish, archive, delete, re-categorize selected items

### 3.2 Learning Paths (Admin)

An Admin can group content entries into an ordered **Learning Path**:

- Title, description, cover image URL
- Ordered list of content entries
- Status (`Draft` | `Published`)
- Estimated total duration (manually entered or auto-summed from entries)

### 3.3 Taxonomy Management (Admin)

- **Categories**: hierarchical (parent / child), each content entry belongs to one category
- **Tags**: flat list, multiple tags per content entry
- Admin can create, rename, merge, and delete categories and tags
- Deleting a category requires reassignment of existing items

### 3.4 Content Discovery (Viewer)

#### 3.4.1 Browse

- Home page shows featured / recently published entries and learning paths
- Browse by category (hierarchical navigation)
- Browse by content type (Videos, Articles, Courses, Files)
- Browse learning paths

#### 3.4.2 Search

- Full-text search across title and summary
- Filter by: content type, category, tag, date range
- Sort by: relevance, most recent, title (A–Z)
- Search results show item type, source, category, and summary excerpt

#### 3.4.3 Content Entry Page

- Shows title, summary, content type, source/author, duration, category, tags, last updated
- Prominent link button to open the external resource
- Related content suggestions (same category / shared tags)

### 3.5 User Management (Admin)

- Create and manage Admin accounts
- Deactivate / reactivate admin accounts
- View list of all admins with last login

There are no Viewer accounts — any person with the URL can access the public site.

---

## 4. Non-Functional Requirements

| Concern | Requirement |
|---|---|
| **Authentication** | Admin interface requires authentication. For v1, CAP's built-in mock authentication is used for local development. No external Identity Provider is required. The viewer-facing site is unauthenticated and publicly accessible. |
| **Authorization** | All write endpoints and the admin interface are protected server-side; unauthenticated requests must be rejected. |
| **Performance** | Content list pages load in under 2 seconds for up to 10,000 entries |
| **Accessibility** | WCAG 2.1 Level AA compliance |
| **Responsiveness** | Fully usable on desktop and tablet; mobile-friendly |
| **Search** | Full-text search response under 1 second for typical queries |

---

## 5. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Runtime / Framework** | SAP Cloud Application Programming Model (CAP) — Node.js | Business logic, service definitions, and OData API are implemented using CDS (Core Data Services) and the CAP Node.js runtime. |
| **Database** | SQLite | Used as the persistence layer via CAP's built-in SQLite adapter. The application runs locally; no cloud database is planned for v1. |
| **API Protocol** | OData V4 | CAP automatically exposes CDS service definitions as OData V4 endpoints, providing standardized querying, filtering, sorting, and pagination out of the box. |
| **Frontend** | SAP Fiori elements | The Admin and Viewer UIs are built with SAP Fiori elements — a metadata-driven UI framework that generates responsive, accessible UIs from OData annotations. This satisfies the WCAG 2.1 AA and responsive design requirements with minimal custom frontend code. |
| **Authentication** | CAP built-in mock auth | Mock authentication is used for local development. No external Identity Provider (IAS, Azure AD, etc.) is required for v1. |
| **Deployment** | Local only | The application runs locally using `cds watch` with SQLite. No cloud deployment (BTP, HANA) is planned for v1. |

### 5.1 Application Architecture

The frontend consists of **two separate Fiori elements applications**:

| App | Route | Purpose |
|---|---|---|
| **Admin App** | `/admin/` | Content management, taxonomy management, learning path authoring, and user management. Requires authentication. |
| **Browse App** | `/browse/` | Public-facing viewer experience for browsing, searching, and navigating to learning content. No authentication required. |

Each app is backed by its own CDS service definition, ensuring a clean separation of concerns between admin write operations and public read-only access.

---

## 6. Data Model (Logical)

```
AdminUser
  id, email, name, status, created_at, last_login

Category
  id, name, parent_id (nullable), slug

Tag
  id, name, slug

ContentItem
  id, type (video|article|course|file), title, url,
  summary, source, duration,
  status (draft|published|archived), category_id,
  thumbnail_url, created_by, created_at, updated_at

ContentItem_Tags  (join: content_item_id, tag_id)

LearningPath
  id, title, description, cover_image_url, status,
  estimated_duration, created_by, created_at, updated_at
  [ordered] LearningPathItem: learning_path_id, content_item_id, position
```

---

## 7. UI / UX Guidelines

- **Admin interface**: dashboard-style layout with sidebar navigation; content list with filters and bulk-action toolbar; form-based entry editor
- **Viewer interface**: clean, readable layout prioritizing content; prominent search bar; card-based content grids; breadcrumb navigation for categories; clear external-link affordance on all cards and detail pages
- Consistent design system (typography, color, spacing, component library — to be defined in design phase)

---

## 8. Out of Scope (v1)

The following features are explicitly deferred to future versions:

- Learner progress tracking and completion status
- Certificates of completion
- Comments or social features
- Content scheduling (publish at a future date)
- Multi-language / localization
- Integration with external LMS (e.g. SuccessFactors, Workday)
- Mobile native application
- Link health checking (detecting broken external URLs)

---

## 9. Open Questions

None.
