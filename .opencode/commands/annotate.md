---
description: Add or update Fiori UI annotations for an entity or app
agent: build
---

Load skill `fiori-elements-ui` before starting.

Add or update Fiori elements annotations for: $ARGUMENTS

Target file(s): `app/admin/webapp/annotations.cds` and/or `app/browse/webapp/annotations.cds`

Ensure the following are present and correct:

**List Report:**
- `@UI.HeaderInfo` — TypeName, TypeNamePlural, Title, Description
- `@UI.LineItem` — all relevant columns with `$Type: 'UI.DataField'`; action buttons with `UI.DataFieldForAction` for Admin app
- `@UI.SelectionFields` — filter bar fields (type, status, category_ID)

**Object Page:**
- `@UI.FieldGroup#<Name>` blocks — logical field groupings
- `@UI.Facets` — sections pointing at FieldGroups and child compositions

**Value Helps:**
- `@Common.ValueList` for association fields (category, tags)
- `@Common.ValueListWithFixedValues` for enum fields (type, status)
- `@Common.Text` + `@Common.TextArrangement: #TextOnly` on association fields

**Field-level:**
- `@UI.MultiLineText` on `summary`
- `@UI.Hidden` on technical fields: `isDeleted`, raw FK `_ID` fields
- `@UI.HiddenFilter @Core.Immutable` on `createdAt`, `createdBy`

**Do not write custom SAPUI5 JavaScript.** All UI must be annotation-driven.

After writing annotations:

!`npx cds build 2>&1`

Fix any compilation errors before reporting done.
