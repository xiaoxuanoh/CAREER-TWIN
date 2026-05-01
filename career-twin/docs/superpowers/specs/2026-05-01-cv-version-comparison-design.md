# CV Version Comparison — Design Spec
**Date:** 2026-05-01

---

## Overview

Allow users to upload a revised CV from the dashboard, re-run the full analysis pipeline, and compare the old and new CV versions side by side. After viewing the comparison, users can switch between versions freely on the regular dashboard.

---

## User Flow

1. User is on the dashboard (3-panel view).
2. Clicks **"Upload New CV"** button in the toolbar (green sage style, next to Compare and Edit CV).
3. A **modal** opens over the dashboard with the existing `UploadZone` component (dashed border drop zone).
4. User uploads a new PDF/DOCX.
5. Modal enters loading state ("Re-analysing your CV…") while the full pipeline runs:
   - `POST /upload-cv` → auto-confirm via `POST /confirm-profile` (skip review page) → `POST /suggest-roles` → `POST /analyze-role-fit` for all suggested roles in parallel
6. When complete, modal closes and the **Comparison View** replaces the dashboard.
7. User clicks a role in the Comparison View → navigates back to the **regular dashboard** with the version toggle visible.
8. On the regular dashboard, users can switch between **Version 1** and **Version 2** using toggle buttons in the left sidebar. All content updates to reflect the active version.

---

## Comparison View Layout

Replaces the regular 3-panel layout after re-analysis completes. Not a separate route — rendered as a view state within `/dashboard`.

**Top bar:** Candidate name spanning full width (no left sidebar).

**Two side-by-side panels:**

| Left — Old CV (Version 1) | Right — New CV (Version 2) |
|---|---|
| Strengths for selected role | Strengths for selected role |
| Weaknesses for selected role | Weaknesses for selected role |
| — | **Improvements vs old version** |
| Career paths + role scores (v1) | Career paths + role scores (v2) |

Clicking a role card in the left panel navigates to the regular dashboard with Version 1 active and that role selected. Clicking a role card in the right panel navigates with Version 2 active and that role selected.

### Improvements Section (right panel only)

Computed on the frontend by diffing v1 and v2 analysis data. No new backend endpoint.

Shows:
- Skills that moved from **missing → matched** (e.g. "SQL database management is now matched")
- New **strengths** not present in v1
- Score delta per sub-category (e.g. Skills +8, Experience +5, Education ±0)

---

## Regular Dashboard — Version Toggle

After a Version 2 exists, the left sidebar gains a **"CV VERSION"** section above Career Paths:

- Two buttons: **Version 1** and **Version 2**
- Active version: darker beige background (e.g. `bg-[#e8ddd0]`, `text-[#4a3f35]`)
- Inactive version: default light button style (same as Compare/Edit CV buttons)
- Switching version replaces: role cards + scores, main content (match score, readiness, strengths, weaknesses), right panel (evidence, CV tips)

The toolbar retains all three buttons: **Compare | Edit CV | Upload New CV**.

---

## Data Storage

All Version 1 data stays in existing sessionStorage keys — nothing is overwritten.

Version 2 uses a parallel set of prefixed keys:

| Key | Content |
|---|---|
| `v2_profile_id` | New profile ID from backend |
| `v2_suggested_roles` | New role suggestions |
| `v2_analysis_cache_<title>` | Per-role analysis results |
| `v2_analysis_result` | Currently selected role analysis |
| `v2_selected_role` | Currently selected role title |
| `active_cv_version` | `"1"` or `"2"` — controls active dataset |

No backend changes required.

---

## Components

### New components
- **`ReuploadModal`** — modal wrapper with `UploadZone` inside, loading state, error handling, Escape/backdrop close (disabled during loading). Lives in `components/dashboard/`.
- **`CVComparisonView`** — 2-panel comparison layout. Reads v1 and v2 data, computes improvements diff, renders role cards per version. Lives in `components/dashboard/`.

### Modified components
- **`ToolsRow`** — add "Upload New CV" green button. Pass `onReupload` handler and `hasV2` prop (hides button once v2 exists and user is in comparison view).
- **`LeftSidebar`** — add CV Version toggle section when `v2_suggested_roles` exists in sessionStorage. Pass `activeVersion` and `onVersionSwitch` props.
- **`dashboard/page.tsx`** — manage `showComparison`, `activeVersion`, `v2Analysis`, `v2Roles` state. Orchestrate the re-upload pipeline. Pass new props to ToolsRow, LeftSidebar, and conditionally render `CVComparisonView` vs regular layout.

---

## Error Handling

- If re-upload fails (network error, parse failure): show error inside the modal with a retry option. Do not close the modal or touch v1 data.
- If `suggest_roles` or `analyze_role_fit` fails for v2: show error in modal, allow retry.
- If the session is lost (v2 data missing on refresh): version toggle is hidden, dashboard falls back to v1 only.

---

## Scope Boundaries

- No new backend endpoints.
- No changes to the upload, review, or roles pages.
- Version 2 is session-scoped — it does not persist across tab closes.
- Only two versions are supported (uploading a third CV is not in scope).
- The "Upload New CV" button is hidden once Version 2 exists (user already has a comparison).
