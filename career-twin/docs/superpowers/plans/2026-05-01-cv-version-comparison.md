# CV Version Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload a revised CV from the dashboard, re-run the full analysis pipeline silently, and compare old vs new versions side by side — with a version toggle on the regular dashboard.

**Architecture:** All v2 data is stored in sessionStorage under `v2_*` keys, leaving v1 data untouched. A modal handles the upload UX. After re-analysis completes, a `CVComparisonView` component replaces the regular dashboard layout. The left sidebar gains a version toggle that swaps the active dataset.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, existing `UploadZone` component, existing `api.ts` functions (`uploadCV`, `confirmProfile`, `suggestRoles`, `analyzeRoleFitWithRetry`).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `components/dashboard/ToolsRow.tsx` | Modify | Add "Upload New CV" green button |
| `components/dashboard/ReuploadModal.tsx` | Create | Modal with UploadZone, loading state, error handling |
| `components/dashboard/CVComparisonView.tsx` | Create | 2-panel comparison layout with improvements diff |
| `components/dashboard/LeftSidebar.tsx` | Modify | Add CV Version toggle section |
| `app/dashboard/page.tsx` | Modify | Orchestrate v2 pipeline, manage version state, render comparison |

---

## Task 1: Add "Upload New CV" button to ToolsRow

**Files:**
- Modify: `career-twin/frontend/components/dashboard/ToolsRow.tsx`

Current ToolsRow props: `onCompare`, `isComparing`, `isCompareLoading`, `canCompare`. We add `onReupload` and `hasV2`.

- [ ] **Step 1: Update ToolsRow**

Replace the entire file content:

```tsx
"use client";

import { useRouter } from "next/navigation";

interface ToolsRowProps {
  onCompare: () => void;
  isComparing: boolean;
  isCompareLoading: boolean;
  canCompare: boolean;
  onReupload: () => void;
  hasV2: boolean;
}

export function ToolsRow({
  onCompare,
  isComparing,
  isCompareLoading,
  canCompare,
  onReupload,
  hasV2,
}: ToolsRowProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border-soft)] bg-[rgba(252,250,246,0.94)] px-6 py-3 backdrop-blur-sm">
      <button
        onClick={onCompare}
        disabled={!canCompare || isCompareLoading}
        className={[
          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          isComparing
            ? "border-[#cfd9e1] bg-[#eaf0f4] text-[#3f5e78]"
            : canCompare
            ? "border-[var(--border-soft)] bg-white text-[#5f574e] hover:border-[#cfd9e1] hover:bg-[#f8fbfc] hover:text-[#3f5e78]"
            : "border-[var(--border-soft)] bg-[#f3eee4] text-[#b0a79a] cursor-not-allowed",
        ].join(" ")}
      >
        {isCompareLoading ? "Comparing…" : isComparing ? "Hide Compare" : "⇆ Compare"}
      </button>
      <button
        onClick={() => router.push("/review")}
        className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-xs font-medium text-[#5f574e] transition-colors hover:border-[#cfd9e1] hover:bg-[#f8fbfc] hover:text-[#3f5e78]"
      >
        ← Edit CV
      </button>
      {!hasV2 && (
        <button
          onClick={onReupload}
          className="rounded-lg border border-[#c5d9c5] bg-[#e8f0e8] px-3 py-1.5 text-xs font-medium text-[#4a7a4a] transition-colors hover:border-[#b0ccb0] hover:bg-[#daeada] hover:text-[#3a6a3a]"
        >
          ↑ Upload New CV
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add career-twin/frontend/components/dashboard/ToolsRow.tsx
git commit -m "feat: add Upload New CV button to ToolsRow"
```

---

## Task 2: Build ReuploadModal component

**Files:**
- Create: `career-twin/frontend/components/dashboard/ReuploadModal.tsx`

This modal wraps the existing `UploadZone`. It shows a loading spinner during re-analysis and an error message on failure. Escape and backdrop close are disabled while loading.

- [ ] **Step 1: Create ReuploadModal**

```tsx
"use client";

import { useEffect, useState } from "react";
import { UploadZone } from "@/components/upload/UploadZone";

interface ReuploadModalProps {
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  onUpload: (file: File) => void;
  onClose: () => void;
}

export function ReuploadModal({
  isLoading,
  loadingMessage,
  error,
  onUpload,
  onClose,
}: ReuploadModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isLoading, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={isLoading ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#2f2a24]">Upload New CV</h2>
            <p className="mt-0.5 text-xs text-[#8c847a]">
              We'll re-run the full analysis and compare both versions.
            </p>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#8c847a] transition-colors hover:bg-[var(--surface-muted)] hover:text-[#2f2a24]"
            >
              ✕
            </button>
          )}
        </div>

        <UploadZone
          onUpload={onUpload}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
        />

        {error && (
          <p className="mt-3 text-center text-sm text-[#a8655b]">{error}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add career-twin/frontend/components/dashboard/ReuploadModal.tsx
git commit -m "feat: add ReuploadModal component"
```

---

## Task 3: Wire v2 pipeline into dashboard/page.tsx

**Files:**
- Modify: `career-twin/frontend/app/dashboard/page.tsx`

This task adds state and logic for the v2 re-upload pipeline. It does NOT yet render the comparison view (Task 4). After this task, clicking "Upload New CV" will run the full pipeline and store results in `v2_*` sessionStorage keys.

The pipeline: `uploadCV` → auto-confirm via `confirmProfile` (uses the structured profile from upload result, skip review page) → `suggestRoles` → `analyzeRoleFitWithRetry` for all suggested roles in parallel → store under `v2_*` keys → set `showComparison = true`.

- [ ] **Step 1: Add v2 state and pipeline to dashboard/page.tsx**

Add these imports at the top (after existing imports):

```tsx
import { uploadCV, confirmProfile, suggestRoles } from "@/lib/api";
import { ReuploadModal } from "@/components/dashboard/ReuploadModal";
```

Add these state variables inside `DashboardPage` (after existing state declarations):

```tsx
const [showReuploadModal, setShowReuploadModal] = useState(false);
const [reuploadLoading, setReuploadLoading] = useState(false);
const [reuploadLoadingMsg, setReuploadLoadingMsg] = useState("Re-analysing your CV…");
const [reuploadError, setReuploadError] = useState<string | null>(null);
const [showComparison, setShowComparison] = useState(false);
const [v2Roles, setV2Roles] = useState<RoleSuggestion[]>([]);
const [v2AnalysisMap, setV2AnalysisMap] = useState<Record<string, AnalyzeRoleFitResponse>>({});
const [activeVersion, setActiveVersion] = useState<1 | 2>(1);
```

Add this function inside `DashboardPage` (after `handleCompareSelect`):

```tsx
async function handleReupload(file: File) {
  setReuploadError(null);
  setReuploadLoading(true);

  const MESSAGES = [
    "Parsing your new CV…",
    "Identifying changes…",
    "Re-analysing roles…",
    "Almost there…",
  ];
  let msgIdx = 0;
  const msgInterval = window.setInterval(() => {
    msgIdx = (msgIdx + 1) % MESSAGES.length;
    setReuploadLoadingMsg(MESSAGES[msgIdx]);
  }, 2500);

  try {
    // Step 1: upload and parse
    const uploadResult = await uploadCV(file);

    // Step 2: auto-confirm (skip review page)
    const confirmResult = await confirmProfile(uploadResult.structured);
    const v2ProfileId = confirmResult.profile_id;

    // Step 3: suggest roles
    const rolesResult = await suggestRoles(v2ProfileId);
    const newRoles = rolesResult.roles;

    // Step 4: analyze all roles in parallel
    const analysisEntries = await Promise.all(
      newRoles.map(async (role) => {
        try {
          const result = await analyzeRoleFitWithRetry(v2ProfileId, role.title, 4);
          const score = (result.match_score as { overall?: number }).overall ?? 0;
          return { role: { ...role, preview_match_score: score }, analysis: result };
        } catch {
          return { role, analysis: null };
        }
      })
    );

    // Step 5: store in sessionStorage
    const scoredRoles = analysisEntries.map((e) => e.role);
    const analysisMap: Record<string, AnalyzeRoleFitResponse> = {};
    for (const entry of analysisEntries) {
      if (entry.analysis) {
        analysisMap[entry.role.title] = entry.analysis;
        sessionStorage.setItem(`v2_analysis_cache_${entry.role.title}`, JSON.stringify(entry.analysis));
      }
    }
    sessionStorage.setItem("v2_profile_id", v2ProfileId);
    sessionStorage.setItem("v2_suggested_roles", JSON.stringify(scoredRoles));
    sessionStorage.setItem("active_cv_version", "1");

    setV2Roles(scoredRoles);
    setV2AnalysisMap(analysisMap);
    setShowReuploadModal(false);
    setShowComparison(true);
  } catch (err) {
    setReuploadError(err instanceof Error ? err.message : "Re-analysis failed. Please try again.");
  } finally {
    window.clearInterval(msgInterval);
    setReuploadLoading(false);
    setReuploadLoadingMsg("Re-analysing your CV…");
  }
}
```

Add the modal just before the closing `</div>` of the outer wrapper in the JSX:

```tsx
{showReuploadModal && (
  <ReuploadModal
    isLoading={reuploadLoading}
    loadingMessage={reuploadLoadingMsg}
    error={reuploadError}
    onUpload={handleReupload}
    onClose={() => {
      if (!reuploadLoading) {
        setShowReuploadModal(false);
        setReuploadError(null);
      }
    }}
  />
)}
```

Update the `ToolsRow` JSX to pass the new props:

```tsx
<ToolsRow
  onCompare={handleCompareToggle}
  isComparing={isComparing}
  isCompareLoading={isCompareLoading}
  canCompare={comparableRoles.length >= 1}
  onReupload={() => { setShowReuploadModal(true); setReuploadError(null); }}
  hasV2={showComparison || v2Roles.length > 0}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd career-twin/frontend && npx tsc --noEmit
```

Expected: no errors related to the new props/state.

- [ ] **Step 3: Commit**

```bash
git add career-twin/frontend/app/dashboard/page.tsx
git commit -m "feat: wire v2 re-upload pipeline into dashboard"
```

---

## Task 4: Build CVComparisonView component

**Files:**
- Create: `career-twin/frontend/components/dashboard/CVComparisonView.tsx`

This component receives v1 and v2 data and renders the 2-panel comparison layout. It computes the improvements diff from the data. Role card clicks call an `onRoleSelect` callback with the role title and version number.

- [ ] **Step 1: Create CVComparisonView**

```tsx
"use client";

import type { AnalyzeRoleFitResponse, RoleSuggestion } from "@/lib/types";
import { SpeedometerArc } from "./SpeedometerArc";

interface CVComparisonViewProps {
  candidateName: string;
  v1Roles: RoleSuggestion[];
  v2Roles: RoleSuggestion[];
  v1AnalysisMap: Record<string, AnalyzeRoleFitResponse>;
  v2AnalysisMap: Record<string, AnalyzeRoleFitResponse>;
  selectedRole: string;
  onRoleSelect: (roleTitle: string, version: 1 | 2) => void;
}

interface ScoreBreakdown {
  skills?: number;
  experience?: number;
  education?: number;
}

function computeImprovements(
  v1: AnalyzeRoleFitResponse,
  v2: AnalyzeRoleFitResponse
): { newSkills: string[]; newStrengths: string[]; scoreDeltas: { label: string; delta: number }[] } {
  const v1Missing = new Set(v1.missing_skills.map((s) => s.toLowerCase()));
  const newSkills = v2.matched_skills.filter((s) => v1Missing.has(s.toLowerCase()));

  const v1StrengthSet = new Set(v1.strengths.map((s) => s.toLowerCase()));
  const newStrengths = v2.strengths.filter((s) => !v1StrengthSet.has(s.toLowerCase()));

  const v1Score = v1.match_score as ScoreBreakdown;
  const v2Score = v2.match_score as ScoreBreakdown;
  const scoreDeltas = (["skills", "experience", "education"] as const)
    .map((key) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      delta: (v2Score[key] ?? 0) - (v1Score[key] ?? 0),
    }))
    .filter((d) => d.delta !== 0);

  return { newSkills, newStrengths, scoreDeltas };
}

function RoleCardList({
  roles,
  analysisMap,
  version,
  onRoleSelect,
}: {
  roles: RoleSuggestion[];
  analysisMap: Record<string, AnalyzeRoleFitResponse>;
  version: 1 | 2;
  onRoleSelect: (title: string, v: 1 | 2) => void;
}) {
  const sorted = [...roles].sort((a, b) => b.preview_match_score - a.preview_match_score);
  return (
    <ul className="grid gap-2">
      {sorted.map((role) => (
        <li key={role.id}>
          <button
            onClick={() => onRoleSelect(role.title, version)}
            className="w-full text-left rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-3 transition-all hover:border-[#d2dde5] hover:bg-[#f8fbfc]"
          >
            <div className="flex items-center gap-3">
              <SpeedometerArc score={role.preview_match_score} size={52} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight text-[#2f2a24]">{role.title}</p>
                {role.short_description && (
                  <p className="text-xs mt-0.5 leading-snug line-clamp-2 text-[#8c847a]">
                    {role.short_description}
                  </p>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CVComparisonView({
  candidateName,
  v1Roles,
  v2Roles,
  v1AnalysisMap,
  v2AnalysisMap,
  selectedRole,
  onRoleSelect,
}: CVComparisonViewProps) {
  const v1 = v1AnalysisMap[selectedRole];
  const v2 = v2AnalysisMap[selectedRole];
  const improvements = v1 && v2 ? computeImprovements(v1, v2) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Candidate bar */}
      <div className="border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-6 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">Candidate</p>
        <p className="mt-0.5 text-sm font-semibold text-[#2f2a24]">{candidateName || "—"}</p>
      </div>

      {/* Two panels */}
      <div className="grid flex-1 grid-cols-1 divide-y divide-[var(--border-soft)] xl:grid-cols-2 xl:divide-x xl:divide-y-0">

        {/* Left — Version 1 */}
        <div className="p-5 xl:overflow-y-auto">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
            Old CV — Version 1
          </p>

          {v1 ? (
            <div className="space-y-5">
              {/* Strengths */}
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                  Strengths
                </h3>
                <ul className="space-y-1.5">
                  {v1.strengths.map((s, i) => (
                    <li key={i} className="rounded-lg bg-[#e9f1ea] px-3 py-1.5 text-sm text-[#5b7f63]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                  Weaknesses
                </h3>
                <ul className="space-y-1.5">
                  {v1.weaknesses.map((w, i) => (
                    <li key={i} className="rounded-lg bg-[#f4e5e0] px-3 py-1.5 text-sm text-[#a8655b]">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#8c847a]">Select a role to see analysis.</p>
          )}

          {/* Career paths */}
          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
              Career Paths
            </p>
            <RoleCardList
              roles={v1Roles}
              analysisMap={v1AnalysisMap}
              version={1}
              onRoleSelect={onRoleSelect}
            />
          </div>
        </div>

        {/* Right — Version 2 */}
        <div className="p-5 xl:overflow-y-auto">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4a7a4a]">
            New CV — Version 2
          </p>

          {v2 ? (
            <div className="space-y-5">
              {/* Strengths */}
              <div className="rounded-2xl border border-[#c5d9c5] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                  Strengths
                </h3>
                <ul className="space-y-1.5">
                  {v2.strengths.map((s, i) => (
                    <li key={i} className="rounded-lg bg-[#e9f1ea] px-3 py-1.5 text-sm text-[#5b7f63]">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                  Weaknesses
                </h3>
                <ul className="space-y-1.5">
                  {v2.weaknesses.map((w, i) => (
                    <li key={i} className="rounded-lg bg-[#f4e5e0] px-3 py-1.5 text-sm text-[#a8655b]">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              {improvements && (improvements.newSkills.length > 0 || improvements.newStrengths.length > 0 || improvements.scoreDeltas.length > 0) && (
                <div className="rounded-2xl border border-[#c5d9c5] bg-[#f0f7f0] p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#4a7a4a]">
                    Improvements vs Old CV
                  </h3>
                  <div className="space-y-3">
                    {improvements.scoreDeltas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {improvements.scoreDeltas.map((d) => (
                          <span
                            key={d.label}
                            className={[
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              d.delta > 0
                                ? "bg-[#e8f0e8] text-[#4a7a4a]"
                                : "bg-[#f4e5e0] text-[#a8655b]",
                            ].join(" ")}
                          >
                            {d.label} {d.delta > 0 ? `+${d.delta}` : d.delta}
                          </span>
                        ))}
                      </div>
                    )}
                    {improvements.newSkills.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-[#4a7a4a]">Skills now matched:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {improvements.newSkills.map((s, i) => (
                            <span key={i} className="rounded-full bg-[#e8f0e8] px-2.5 py-0.5 text-xs text-[#4a7a4a]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {improvements.newStrengths.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-[#4a7a4a]">New strengths:</p>
                        <ul className="space-y-1">
                          {improvements.newStrengths.map((s, i) => (
                            <li key={i} className="text-xs text-[#5b7f63]">+ {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#8c847a]">Select a role to see analysis.</p>
          )}

          {/* Career paths */}
          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
              Career Paths
            </p>
            <RoleCardList
              roles={v2Roles}
              analysisMap={v2AnalysisMap}
              version={2}
              onRoleSelect={onRoleSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd career-twin/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add career-twin/frontend/components/dashboard/CVComparisonView.tsx
git commit -m "feat: add CVComparisonView component"
```

---

## Task 5: Add version toggle to LeftSidebar

**Files:**
- Modify: `career-twin/frontend/components/dashboard/LeftSidebar.tsx`

Add `activeVersion`, `hasV2`, and `onVersionSwitch` props. Render a "CV VERSION" toggle section above Career Paths when `hasV2` is true.

- [ ] **Step 1: Update LeftSidebar**

Replace the entire file:

```tsx
import type { RoleSuggestion } from "@/lib/types";
import { SpeedometerArc } from "./SpeedometerArc";

interface LeftSidebarProps {
  candidateName: string;
  roles: RoleSuggestion[];
  selectedRole: string;
  onRoleSwitch: (role: RoleSuggestion) => void;
  isSwitching: boolean;
  hasV2?: boolean;
  activeVersion?: 1 | 2;
  onVersionSwitch?: (version: 1 | 2) => void;
}

export function LeftSidebar({
  candidateName,
  roles,
  selectedRole,
  onRoleSwitch,
  isSwitching,
  hasV2 = false,
  activeVersion = 1,
  onVersionSwitch,
}: LeftSidebarProps) {
  const sortedRoles = [...roles].sort((a, b) => b.preview_match_score - a.preview_match_score);

  return (
    <aside className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">Candidate</p>
        <p className="mt-1.5 truncate text-sm font-semibold text-[#2f2a24]">{candidateName || "—"}</p>
      </div>

      {hasV2 && onVersionSwitch && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
            CV Version
          </p>
          <div className="flex gap-2">
            {([1, 2] as const).map((v) => (
              <button
                key={v}
                onClick={() => onVersionSwitch(v)}
                className={[
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  activeVersion === v
                    ? "border-[#c8b89a] bg-[#e8ddd0] text-[#4a3f35]"
                    : "border-[var(--border-soft)] bg-[var(--surface)] text-[#5f574e] hover:bg-[#f3ede4]",
                ].join(" ")}
              >
                Version {v}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
          Career Paths
        </p>
        <ul className="grid gap-2.5 sm:gap-3">
          {sortedRoles.map((role) => {
            const isActive = role.title === selectedRole || role.id === selectedRole;
            return (
              <li key={role.id}>
                <button
                  onClick={() => !isActive && !isSwitching && onRoleSwitch(role)}
                  disabled={isActive || isSwitching}
                  className={[
                    "w-full text-left rounded-2xl border px-3.5 py-3 transition-all duration-200",
                    isActive
                      ? "border-[#cfd9e1] bg-[#edf2f5] shadow-[0_1px_2px_rgba(47,42,36,0.04)]"
                      : isSwitching
                      ? "border-[var(--border-soft)] bg-[var(--surface)] opacity-50 cursor-not-allowed"
                      : "border-[var(--border-soft)] bg-[var(--surface)] hover:border-[#d2dde5] hover:bg-[#f8fbfc] cursor-pointer",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <SpeedometerArc score={role.preview_match_score} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className={[
                        "text-sm font-bold leading-tight",
                        isActive ? "text-[#2f4b61]" : "text-[#2f2a24]",
                      ].join(" ")}>
                        {role.title}
                      </p>
                      {role.short_description && (
                        <p className={[
                          "text-xs mt-0.5 leading-snug line-clamp-2",
                          isActive ? "text-[#5f7a90]" : "text-[#8c847a]",
                        ].join(" ")}>
                          {role.short_description}
                        </p>
                      )}
                    </div>
                  </div>

                  {role.skills && role.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            isActive
                              ? "bg-[#dbe6ed] text-[#3f5e78]"
                              : "bg-[#f2ede4] text-[#6f675d]",
                          ].join(" ")}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
          {sortedRoles.length === 0 && (
            <li>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-3">
                <p className="truncate text-sm font-semibold text-[#2f4b61]">{selectedRole}</p>
                <p className="text-xs text-[#8c847a]">Custom role</p>
              </div>
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add career-twin/frontend/components/dashboard/LeftSidebar.tsx
git commit -m "feat: add CV version toggle to LeftSidebar"
```

---

## Task 6: Wire comparison view and version toggle into dashboard/page.tsx

**Files:**
- Modify: `career-twin/frontend/app/dashboard/page.tsx`

This final task:
1. Imports `CVComparisonView`
2. Adds a `comparisonSelectedRole` state (the role highlighted in the comparison view, defaults to `selectedRole`)
3. Renders `CVComparisonView` when `showComparison` is true
4. Handles `onRoleSelect` from comparison view (sets active version, sets selectedRole, hides comparison)
5. Handles `onVersionSwitch` from LeftSidebar (swaps roles + analysis to correct v1/v2 dataset)
6. Passes `hasV2`, `activeVersion`, `onVersionSwitch` to `LeftSidebar`

- [ ] **Step 1: Add CVComparisonView import**

Add to imports at top of `app/dashboard/page.tsx`:

```tsx
import { CVComparisonView } from "@/components/dashboard/CVComparisonView";
```

- [ ] **Step 2: Add comparisonSelectedRole state and v1AnalysisMap state**

Add inside `DashboardPage` after existing state:

```tsx
const [comparisonSelectedRole, setComparisonSelectedRole] = useState("");
const [v1AnalysisMap, setV1AnalysisMap] = useState<Record<string, AnalyzeRoleFitResponse>>({});
```

In `handleReupload`, after `setV2AnalysisMap(analysisMap)`, add:

```tsx
// Snapshot v1 analysis map before showing comparison
const v1Map: Record<string, AnalyzeRoleFitResponse> = {};
for (const role of roles) {
  const cached = sessionStorage.getItem(`analysis_cache_${role.title}`);
  if (cached) {
    try { v1Map[role.title] = JSON.parse(cached) as AnalyzeRoleFitResponse; } catch { /* ignore */ }
  }
}
setV1AnalysisMap(v1Map);
```
```

- [ ] **Step 3: Add handleComparisonRoleSelect and handleVersionSwitch**

Add these functions inside `DashboardPage`:

```tsx
function handleComparisonRoleSelect(roleTitle: string, version: 1 | 2) {
  setActiveVersion(version);
  setShowComparison(false);

  const targetRoles = version === 1 ? roles : v2Roles;
  const targetRole = targetRoles.find((r) => r.title === roleTitle);

  if (version === 2) {
    const v2Analysis = v2AnalysisMap[roleTitle];
    if (v2Analysis) {
      setAnalysis(v2Analysis);
      setRoles(v2Roles);
      setSelectedRole(roleTitle);
      sessionStorage.setItem("active_cv_version", "2");
    }
  } else {
    const cached = sessionStorage.getItem(`analysis_cache_${roleTitle}`);
    if (cached) {
      setAnalysis(JSON.parse(cached) as AnalyzeRoleFitResponse);
      setSelectedRole(roleTitle);
      sessionStorage.setItem("active_cv_version", "1");
    }
  }
  void targetRole;
}

function handleVersionSwitch(version: 1 | 2) {
  setActiveVersion(version);
  sessionStorage.setItem("active_cv_version", version.toString());

  if (version === 2) {
    const v2RolesRaw = sessionStorage.getItem("v2_suggested_roles");
    if (v2RolesRaw) {
      const newRoles: RoleSuggestion[] = JSON.parse(v2RolesRaw);
      setRoles(newRoles);
      const firstRole = newRoles[0];
      if (firstRole) {
        const cached = sessionStorage.getItem(`v2_analysis_cache_${firstRole.title}`);
        if (cached) {
          setAnalysis(JSON.parse(cached) as AnalyzeRoleFitResponse);
          setSelectedRole(firstRole.title);
        }
      }
    }
  } else {
    const v1RolesRaw = sessionStorage.getItem("suggested_roles");
    if (v1RolesRaw) {
      const originalRoles: RoleSuggestion[] = JSON.parse(v1RolesRaw);
      setRoles(originalRoles);
      const currentRole = sessionStorage.getItem("selected_role") ?? originalRoles[0]?.title ?? "";
      const cached = sessionStorage.getItem(`analysis_cache_${currentRole}`);
      if (cached) {
        setAnalysis(JSON.parse(cached) as AnalyzeRoleFitResponse);
        setSelectedRole(currentRole);
      }
    }
  }
}
```

- [ ] **Step 4: Set comparisonSelectedRole when showComparison becomes true**

In `handleReupload`, after `setShowComparison(true)`, add:

```tsx
setComparisonSelectedRole(selectedRole);
```

- [ ] **Step 5: Render CVComparisonView when showComparison is true**

In the return JSX of `DashboardPage`, wrap the existing layout in a conditional. Replace:

```tsx
return (
  <div className="flex min-h-screen flex-col bg-[var(--background)] lg:h-screen lg:flex-row lg:overflow-hidden">
```

with:

```tsx
if (showComparison) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border-soft)] bg-[rgba(252,250,246,0.94)] px-6 py-3 backdrop-blur-sm">
        <button
          onClick={() => setShowComparison(false)}
          className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-xs font-medium text-[#5f574e] transition-colors hover:border-[#cfd9e1] hover:bg-[#f8fbfc] hover:text-[#3f5e78]"
        >
          ← Back to Dashboard
        </button>
      </div>
      <CVComparisonView
        candidateName={candidateName}
        v1Roles={roles}
        v2Roles={v2Roles}
        v1AnalysisMap={v1AnalysisMap}
        v2AnalysisMap={v2AnalysisMap}
        selectedRole={comparisonSelectedRole || selectedRole}
        onRoleSelect={handleComparisonRoleSelect}
      />
      {showReuploadModal && (
        <ReuploadModal
          isLoading={reuploadLoading}
          loadingMessage={reuploadLoadingMsg}
          error={reuploadError}
          onUpload={handleReupload}
          onClose={() => { if (!reuploadLoading) { setShowReuploadModal(false); setReuploadError(null); } }}
        />
      )}
    </>
  );
}

return (
  <div className="flex min-h-screen flex-col bg-[var(--background)] lg:h-screen lg:flex-row lg:overflow-hidden">
```

- [ ] **Step 6: Pass version toggle props to LeftSidebar**

Update the `LeftSidebar` JSX to pass new props:

```tsx
<LeftSidebar
  candidateName={candidateName}
  roles={roles}
  selectedRole={selectedRole}
  onRoleSwitch={handleRoleSwitch}
  isSwitching={isSwitching}
  hasV2={v2Roles.length > 0}
  activeVersion={activeVersion}
  onVersionSwitch={handleVersionSwitch}
/>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd career-twin/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Start the dev server and test the happy path**

```bash
cd career-twin/frontend && npm run dev
```

Test sequence:
1. Upload a CV → go through to dashboard (Version 1 data loads)
2. Click "↑ Upload New CV" → modal appears
3. Drop a PDF → loading state cycles through messages
4. Modal closes → Comparison View renders with two panels
5. Left panel shows v1 strengths/weaknesses, right panel shows v2 + improvements section
6. Click a role card in the right panel → returns to regular dashboard with Version 2 active, sidebar shows version toggle
7. Click "Version 1" in sidebar → roles and scores swap to v1 data
8. Click "Version 2" → roles and scores swap back to v2 data
9. "↑ Upload New CV" button is hidden (hasV2 = true)

- [ ] **Step 9: Commit**

```bash
git add career-twin/frontend/app/dashboard/page.tsx
git commit -m "feat: wire CVComparisonView and version toggle into dashboard"
```

- [ ] **Step 10: Push to GitHub**

```bash
git push
```
