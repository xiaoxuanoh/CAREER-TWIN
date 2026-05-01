"use client";

import type { AnalyzeRoleFitResponse, RoleSuggestion } from "@/lib/types";
import { SpeedometerArc } from "./SpeedometerArc";

interface CVComparisonViewProps {
  candidateName: string;
  v1Roles: RoleSuggestion[];
  v2Roles: RoleSuggestion[];
  v1AnalysisMap: Record<string, AnalyzeRoleFitResponse>;
  v2AnalysisMap: Record<string, AnalyzeRoleFitResponse>;
  onRoleSelect: (roleTitle: string, version: 1 | 2) => void;
}

function aggregateTopItems(
  analysisMap: Record<string, AnalyzeRoleFitResponse>,
  field: "matched_skills" | "missing_skills",
  topN: number
): string[] {
  const counts = new Map<string, { count: number; original: string }>();
  for (const analysis of Object.values(analysisMap)) {
    for (const item of analysis[field]) {
      const key = item.toLowerCase().trim();
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { count: 1, original: item });
      }
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((v) => v.original);
}

function RoleCardList({
  roles,
  version,
  onRoleSelect,
}: {
  roles: RoleSuggestion[];
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
  onRoleSelect,
}: CVComparisonViewProps) {
  const hasV1 = Object.keys(v1AnalysisMap).length > 0;
  const hasV2 = Object.keys(v2AnalysisMap).length > 0;

  const v1Demonstrated = hasV1 ? aggregateTopItems(v1AnalysisMap, "matched_skills", 6) : [];
  const v1Gaps = hasV1 ? aggregateTopItems(v1AnalysisMap, "missing_skills", 4) : [];

  const v2Demonstrated = hasV2 ? aggregateTopItems(v2AnalysisMap, "matched_skills", 6) : [];
  const v2Gaps = hasV2 ? aggregateTopItems(v2AnalysisMap, "missing_skills", 4) : [];

  // Skills that appear in v2's matched but not in v1's matched
  const v1DemonstratedSet = new Set(v1Demonstrated.map((s) => s.toLowerCase()));
  const v2NewSkills = v2Demonstrated.filter((s) => !v1DemonstratedSet.has(s.toLowerCase()));

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

          <div className="space-y-4">
            {/* Skills demonstrated */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                What this CV demonstrates
              </h3>
              {v1Demonstrated.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {v1Demonstrated.map((s) => (
                    <span key={s} className="rounded-lg bg-[#e9f1ea] px-3 py-1.5 text-sm text-[#5b7f63]">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8c847a]">No analysis available.</p>
              )}
            </div>

            {/* Common gaps */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                Common gaps
              </h3>
              {v1Gaps.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {v1Gaps.map((s) => (
                    <span key={s} className="rounded-lg bg-[#f4e5e0] px-3 py-1.5 text-sm text-[#a8655b]">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8c847a]">No gaps identified.</p>
              )}
            </div>
          </div>

          {/* Career paths */}
          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
              Career Paths
            </p>
            <RoleCardList roles={v1Roles} version={1} onRoleSelect={onRoleSelect} />
          </div>
        </div>

        {/* Right — Version 2 */}
        <div className="p-5 xl:overflow-y-auto">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4a7a4a]">
            New CV — Version 2
          </p>

          <div className="space-y-4">
            {/* Skills demonstrated */}
            <div className="rounded-2xl border border-[#c5d9c5] bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                What this CV demonstrates
              </h3>
              {v2Demonstrated.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {v2Demonstrated.map((s) => (
                    <span key={s} className="rounded-lg bg-[#e9f1ea] px-3 py-1.5 text-sm text-[#5b7f63]">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8c847a]">No analysis available.</p>
              )}
            </div>

            {/* Common gaps */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                Common gaps
              </h3>
              {v2Gaps.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {v2Gaps.map((s) => (
                    <span key={s} className="rounded-lg bg-[#f4e5e0] px-3 py-1.5 text-sm text-[#a8655b]">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8c847a]">No gaps identified.</p>
              )}
            </div>

            {/* New in this version */}
            {v2NewSkills.length > 0 && (
              <div className="rounded-2xl border border-[#c5d9c5] bg-[#f0f7f0] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#4a7a4a]">
                  New in this version
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {v2NewSkills.map((s) => (
                    <span key={s} className="rounded-full bg-[#e8f0e8] px-2.5 py-1 text-xs font-medium text-[#4a7a4a]">
                      + {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Career paths */}
          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
              Career Paths
            </p>
            <RoleCardList roles={v2Roles} version={2} onRoleSelect={onRoleSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
