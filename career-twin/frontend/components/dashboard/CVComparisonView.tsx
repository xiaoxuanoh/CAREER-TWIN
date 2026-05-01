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

  const v1Score = v1.score_breakdown as ScoreBreakdown;
  const v2Score = v2.score_breakdown as ScoreBreakdown;
  const scoreDeltas = (["skills", "experience", "education"] as const)
    .map((key) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      delta: Number(v2Score[key] ?? 0) - Number(v1Score[key] ?? 0),
    }))
    .filter((d) => d.delta !== 0 && !isNaN(d.delta));

  return { newSkills, newStrengths, scoreDeltas };
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
                {v1.strengths.length > 0 ? (
                  <ul className="space-y-1.5">
                    {v1.strengths.map((s) => (
                      <li key={s} className="rounded-lg bg-[#e9f1ea] px-3 py-1.5 text-sm text-[#5b7f63]">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#8c847a]">None noted.</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                  Weaknesses
                </h3>
                {v1.weaknesses.length > 0 ? (
                  <ul className="space-y-1.5">
                    {v1.weaknesses.map((w) => (
                      <li key={w} className="rounded-lg bg-[#f4e5e0] px-3 py-1.5 text-sm text-[#a8655b]">
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#8c847a]">None noted.</p>
                )}
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
                {v2.strengths.length > 0 ? (
                  <ul className="space-y-1.5">
                    {v2.strengths.map((s) => (
                      <li key={s} className="rounded-lg bg-[#e9f1ea] px-3 py-1.5 text-sm text-[#5b7f63]">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#8c847a]">None noted.</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5f574e]">
                  Weaknesses
                </h3>
                {v2.weaknesses.length > 0 ? (
                  <ul className="space-y-1.5">
                    {v2.weaknesses.map((w) => (
                      <li key={w} className="rounded-lg bg-[#f4e5e0] px-3 py-1.5 text-sm text-[#a8655b]">
                        {w}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#8c847a]">None noted.</p>
                )}
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
                          {improvements.newSkills.map((s) => (
                            <span key={s} className="rounded-full bg-[#e8f0e8] px-2.5 py-0.5 text-xs text-[#4a7a4a]">
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
                          {improvements.newStrengths.map((s) => (
                            <li key={s} className="text-xs text-[#5b7f63]">+ {s}</li>
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
              version={2}
              onRoleSelect={onRoleSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
