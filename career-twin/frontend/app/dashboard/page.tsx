"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { MainContent } from "@/components/dashboard/MainContent";
import { RightPanel } from "@/components/dashboard/RightPanel";
import { ToolsRow } from "@/components/dashboard/ToolsRow";
import { analyzeRoleFit, analyzeRoleFitWithRetry, uploadCV, confirmProfile, suggestRoles } from "@/lib/api";
import { ReuploadModal } from "@/components/dashboard/ReuploadModal";
import { CVComparisonView } from "@/components/dashboard/CVComparisonView";
import type { AnalyzeRoleFitResponse, RoleSuggestion } from "@/lib/types";

const CACHE_KEY = (title: string) => `analysis_cache_${title}`;

export default function DashboardPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalyzeRoleFitResponse | null>(null);
  const [compareAnalysis, setCompareAnalysis] = useState<AnalyzeRoleFitResponse | null>(null);
  const [compareRole, setCompareRole] = useState<string>("");
  const [roles, setRoles] = useState<RoleSuggestion[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [profileId, setProfileId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [comparePickerOpen, setComparePickerOpen] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [reuploadLoading, setReuploadLoading] = useState(false);
  const [reuploadLoadingMsg, setReuploadLoadingMsg] = useState("Re-analysing your CV…");
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [v2Roles, setV2Roles] = useState<RoleSuggestion[]>([]);
  const [v2AnalysisMap, setV2AnalysisMap] = useState<Record<string, AnalyzeRoleFitResponse>>({});
  const [activeVersion, setActiveVersion] = useState<1 | 2>(1);
  const [comparisonSelectedRole, setComparisonSelectedRole] = useState("");
  const [v1AnalysisMap, setV1AnalysisMap] = useState<Record<string, AnalyzeRoleFitResponse>>({});
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [highlightSequence, setHighlightSequence] = useState(0);
  const highlightTimeoutRef = useRef<number | null>(null);
  const singlePaneRef = useRef<HTMLDivElement | null>(null);
  const currentComparePaneRef = useRef<HTMLDivElement | null>(null);
  const targetComparePaneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const raw = sessionStorage.getItem("analysis_result");
    if (!raw) { router.push("/roles"); return; }
    const parsedAnalysis: AnalyzeRoleFitResponse = JSON.parse(raw);
    setAnalysis(parsedAnalysis);

    const rolesRaw = sessionStorage.getItem("suggested_roles");
    const parsedRoles: RoleSuggestion[] = rolesRaw ? JSON.parse(rolesRaw) : [];

    const role = sessionStorage.getItem("selected_role") ?? "";
    if (role) setSelectedRole(role);

    // Sync preview_match_score with the actual analysis score for the selected role
    const actualScore = (parsedAnalysis.match_score as { overall?: number }).overall;
    if (actualScore !== undefined && role && parsedRoles.length > 0) {
      const updatedRoles = parsedRoles.map(r =>
        r.title === role ? { ...r, preview_match_score: actualScore } : r
      );
      setRoles(updatedRoles);
      sessionStorage.setItem("suggested_roles", JSON.stringify(updatedRoles));
    } else {
      setRoles(parsedRoles);
    }

    const pid = sessionStorage.getItem("profile_id");
    if (pid) setProfileId(pid);

    const profileRaw = sessionStorage.getItem("confirmed_profile");
    if (profileRaw) {
      try { setCandidateName(JSON.parse(profileRaw).name ?? ""); } catch { /* ignore */ }
    }

    if (pid && parsedRoles.length > 0) {
      void (async () => {
        for (const currentRole of parsedRoles) {
          // Skip if we already have a full cached analysis for this role
          if (sessionStorage.getItem(CACHE_KEY(currentRole.title))) {
            continue;
          }

          try {
            const result = await analyzeRoleFitWithRetry(pid, currentRole.title, 4);
            if (cancelled) return;

            const nextScore = (result.match_score as { overall?: number }).overall;
            if (nextScore === undefined) {
              continue;
            }

            if (currentRole.title === role) {
              setAnalysis(result);
              sessionStorage.setItem("analysis_result", JSON.stringify(result));
            }

            sessionStorage.setItem(CACHE_KEY(currentRole.title), JSON.stringify(result));
              setRoles((prev) => {
                const updated = prev.map((item) =>
                  item.title === currentRole.title
                    ? { ...item, preview_match_score: nextScore }
                    : item
                );
                sessionStorage.setItem("suggested_roles", JSON.stringify(updated));
                return updated;
              });
          } catch {
            if (cancelled) return;
          }
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleRoleSwitch(role: RoleSuggestion) {
    if (!profileId || isSwitching) return;
    setSwitchError(null);
    setIsComparing(false);
    setCompareAnalysis(null);
    setComparePickerOpen(false);

    // Use cached full analysis if available (pre-computed on roles page)
    const cached = sessionStorage.getItem(`analysis_cache_${role.title}`);
    if (cached) {
      const result = JSON.parse(cached) as AnalyzeRoleFitResponse;
      setAnalysis(result);
      setSelectedRole(role.title);
      sessionStorage.setItem("analysis_result", cached);
      sessionStorage.setItem("selected_role", role.title);
      const actualScore = (result.match_score as { overall?: number }).overall;
      if (actualScore !== undefined) {
        setRoles(prev => {
          const updated = prev.map(r =>
            r.title === role.title ? { ...r, preview_match_score: actualScore } : r
          );
          sessionStorage.setItem("suggested_roles", JSON.stringify(updated));
          return updated;
        });
      }
      return;
    }

    // Fallback: live API call (custom roles or cache miss)
    setIsSwitching(true);
    try {
      const result = await analyzeRoleFit(profileId, role.title);
      setAnalysis(result);
      setSelectedRole(role.title);
      sessionStorage.setItem("analysis_result", JSON.stringify(result));
      sessionStorage.setItem("selected_role", role.title);
      sessionStorage.setItem(CACHE_KEY(role.title), JSON.stringify(result));
      const actualScore = (result.match_score as { overall?: number }).overall;
      if (actualScore !== undefined) {
        setRoles(prev => {
          const updated = prev.map(r =>
            r.title === role.title ? { ...r, preview_match_score: actualScore } : r
          );
          sessionStorage.setItem("suggested_roles", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Role switch failed.");
    } finally {
      setIsSwitching(false);
    }
  }

  function handleRecommendedAction(anchor: string) {
    const scrollPaneToSection = (paneRef: RefObject<HTMLDivElement | null>, sectionId: string) => {
      const pane = paneRef.current;
      if (!pane) return;

      const target = pane.querySelector<HTMLElement>(`[data-dashboard-section="${sectionId}"]`);
      if (!target) return;

      const paneTop = pane.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      const nextTop = pane.scrollTop + (targetTop - paneTop) - 20;
      pane.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    };

    if (isComparing && compareAnalysis) {
      scrollPaneToSection(currentComparePaneRef, anchor);
      scrollPaneToSection(targetComparePaneRef, anchor);
    } else {
      scrollPaneToSection(singlePaneRef, anchor);
    }

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    setHighlightedSectionId(anchor);
    setHighlightSequence((current) => current + 1);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSectionId((current) => (current === anchor ? null : current));
      highlightTimeoutRef.current = null;
    }, 1800);
  }

  // Toggle compare: if already comparing, hide; otherwise open picker
  function handleCompareToggle() {
    if (isComparing) {
      setIsComparing(false);
      setCompareAnalysis(null);
      setCompareRole("");
      setComparePickerOpen(false);
      setRightPanelOpen(true);
    } else {
      setComparePickerOpen(prev => !prev);
    }
  }

  async function handleCompareSelect(role: RoleSuggestion) {
    if (!profileId) return;
    setComparePickerOpen(false);

    // Use pre-computed cache so compare score matches what the role card shows
    const cached = sessionStorage.getItem(CACHE_KEY(role.title));
    if (cached) {
      setCompareAnalysis(JSON.parse(cached) as AnalyzeRoleFitResponse);
      setCompareRole(role.title);
      setIsComparing(true);
      setRightPanelOpen(false);
      return;
    }

    setIsCompareLoading(true);
    try {
      const result = await analyzeRoleFit(profileId, role.title);
      sessionStorage.setItem(CACHE_KEY(role.title), JSON.stringify(result));
      setCompareAnalysis(result);
      setCompareRole(role.title);
      setIsComparing(true);
      setRightPanelOpen(false);
    } catch {
      /* silently fail — compare is non-critical */
    } finally {
      setIsCompareLoading(false);
    }
  }

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
      const uploadResult = await uploadCV(file);
      const confirmResult = await confirmProfile(uploadResult.structured);
      const v2ProfileId = confirmResult.profile_id;

      const rolesResult = await suggestRoles(v2ProfileId);
      const newRoles = rolesResult.roles;

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

      // Snapshot v1 analysis map before showing comparison
      const v1Map: Record<string, AnalyzeRoleFitResponse> = {};
      for (const role of roles) {
        const cached = sessionStorage.getItem(`analysis_cache_${role.title}`);
        if (cached) {
          try { v1Map[role.title] = JSON.parse(cached) as AnalyzeRoleFitResponse; } catch { /* ignore */ }
        }
      }
      setV1AnalysisMap(v1Map);
      setComparisonSelectedRole(selectedRole);

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

  function handleComparisonRoleSelect(roleTitle: string, version: 1 | 2) {
    setActiveVersion(version);
    setShowComparison(false);

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
  }

  function handleVersionSwitch(version: 1 | 2) {
    setActiveVersion(version);
    sessionStorage.setItem("active_cv_version", version.toString());

    if (version === 2) {
      const v2RolesRaw = sessionStorage.getItem("v2_suggested_roles");
      if (v2RolesRaw) {
        const newRoles: RoleSuggestion[] = JSON.parse(v2RolesRaw);
        // Try to match current selected role, fall back to first role
        const targetTitle = newRoles.find((r) => r.title === selectedRole)?.title ?? newRoles[0]?.title;
        const cached = targetTitle
          ? sessionStorage.getItem(`v2_analysis_cache_${targetTitle}`)
          : null;
        if (cached && targetTitle) {
          setRoles(newRoles);
          setAnalysis(JSON.parse(cached) as AnalyzeRoleFitResponse);
          setSelectedRole(targetTitle);
        }
      }
    } else {
      const v1RolesRaw = sessionStorage.getItem("suggested_roles");
      if (v1RolesRaw) {
        const originalRoles: RoleSuggestion[] = JSON.parse(v1RolesRaw);
        const currentRole = sessionStorage.getItem("selected_role") ?? originalRoles[0]?.title ?? "";
        const cached = sessionStorage.getItem(`analysis_cache_${currentRole}`);
        if (cached && currentRole) {
          setRoles(originalRoles);
          setAnalysis(JSON.parse(cached) as AnalyzeRoleFitResponse);
          setSelectedRole(currentRole);
        }
      }
    }
  }

  if (!analysis) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--background)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c4a882] border-t-transparent" />
    </div>
  );

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
      </>
    );
  }

  // Roles available to compare (exclude current)
  const comparableRoles = roles.filter(r => r.title !== selectedRole);
  const hasV2 = v2Roles.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Left sidebar */}
      <div className="border-b border-[var(--border-soft)] bg-[var(--surface-muted)] lg:w-[290px] lg:flex-shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <LeftSidebar
          candidateName={candidateName}
          roles={roles}
          selectedRole={selectedRole}
          onRoleSwitch={handleRoleSwitch}
          isSwitching={isSwitching}
          hasV2={hasV2}
          activeVersion={activeVersion}
          onVersionSwitch={handleVersionSwitch}
        />
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
        <ToolsRow
          onCompare={handleCompareToggle}
          isComparing={isComparing}
          isCompareLoading={isCompareLoading}
          canCompare={comparableRoles.length >= 1}
          onReupload={() => { setShowReuploadModal(true); setReuploadError(null); }}
          hasV2={hasV2}
        />

        {/* Role picker (shown when picker is open) */}
        {comparePickerOpen && !isComparing && (
          <div className="border-b border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 sm:px-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">
              Choose a role to compare with:
            </p>
            <div className="flex flex-wrap gap-2">
              {comparableRoles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleCompareSelect(role)}
                  className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5 text-xs font-medium text-[#5f574e] transition-colors hover:border-[#cfd9e1] hover:bg-[#f8fbfc] hover:text-[#3f5e78]"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Switch error banner */}
        {switchError && (
          <div className="mx-4 mt-3 rounded-lg border border-[#ead2cc] bg-[#f8eeeb] px-4 py-2 text-sm text-[#a8655b] sm:mx-6">
            {switchError} —{" "}
            <button onClick={() => setSwitchError(null)} className="underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Switching overlay */}
        {isSwitching && (
          <div className="flex flex-1 items-center justify-center text-sm text-[#8c847a]">
            Analysing new role…
          </div>
        )}

        {/* Content: side-by-side when comparing, single otherwise */}
        {!isSwitching && (
          <div ref={singlePaneRef} className="flex-1 lg:overflow-y-auto">
            {isComparing && compareAnalysis ? (
              <div className="grid h-full grid-cols-1 divide-y divide-[var(--border-soft)] xl:grid-cols-2 xl:divide-x xl:divide-y-0">
                {/* Left: current role */}
                <div ref={currentComparePaneRef} className="xl:overflow-y-auto">
                  <div className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 sm:px-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c847a]">Current</p>
                    <p className="truncate text-sm font-semibold text-[#2f2a24]">{selectedRole}</p>
                  </div>
                  <MainContent
                    data={analysis}
                    profileId={profileId}
                    selectedRole={selectedRole}
                    highlightedSectionId={highlightedSectionId}
                    highlightSequence={highlightSequence}
                  />
                </div>
                {/* Right: compared role */}
                <div ref={targetComparePaneRef} className="xl:overflow-y-auto">
                  <div className="sticky top-0 z-10 border-b border-[#d9e3ea] bg-[#eef3f6] px-4 py-2 sm:px-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#708697]">Comparing</p>
                    <p className="truncate text-sm font-semibold text-[#2f4b61]">{compareRole}</p>
                  </div>
                  <MainContent
                    data={compareAnalysis}
                    profileId={profileId}
                    selectedRole={compareRole}
                    highlightedSectionId={highlightedSectionId}
                    highlightSequence={highlightSequence}
                  />
                </div>
              </div>
            ) : (
              <MainContent
                data={analysis}
                profileId={profileId}
                selectedRole={selectedRole}
                highlightedSectionId={highlightedSectionId}
                highlightSequence={highlightSequence}
              />
            )}
          </div>
        )}
      </div>

      {/* Right panel — hidden during compare, togglable */}
      {(!isComparing || rightPanelOpen) && (
        <div className="border-t border-[var(--border-soft)] bg-[var(--surface-muted)] lg:w-64 lg:flex-shrink-0 lg:overflow-y-auto lg:border-t-0">
          <RightPanel
            evidenceItems={analysis.evidence_items}
            resumeImprovements={analysis.resume_improvements}
            onActionSelect={handleRecommendedAction}
          />
        </div>
      )}

      {/* Floating toggle — only visible during compare */}
      {isComparing && (
        <button
          onClick={() => setRightPanelOpen(prev => !prev)}
          title={rightPanelOpen ? "Close panel" : "Open panel"}
          className="fixed right-0 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-[#c7d7e3] bg-[#eef3f6] px-2 py-4 text-[#3f5e78] shadow transition-colors hover:bg-[#e3edf3] hover:text-[#2f4b61] lg:flex"
        >
          <span className="text-base leading-none">{rightPanelOpen ? "›" : "‹"}</span>
        </button>
      )}

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
    </div>
  );
}
