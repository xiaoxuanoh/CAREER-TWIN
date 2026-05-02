"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TextShimmer } from "@/components/core/text-shimmer";
import { RoleCard } from "@/components/roles/RoleCard";
import { suggestRoles, analyzeRoleFit, analyzeRoleFitWithRetry } from "@/lib/api";
import { checkAndClearIfExpired, touchSession } from "@/lib/session";
import { Loader2 } from "lucide-react";
import type { RoleSuggestion, AnalyzeRoleFitResponse } from "@/lib/types";

const ANALYSIS_MESSAGES = [
  "Analyzing your profile…",
  "Mapping skill gaps…",
  "Building your roadmap…",
  "Almost there…",
];

const CACHE_KEY = (title: string) => `analysis_cache_${title}`;
const HEADER_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

const ROLE_LIST_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleSuggestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState(ANALYSIS_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  // Track which role IDs are still being analysed in background
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (checkAndClearIfExpired()) { router.push("/"); return; }
    const profileId = localStorage.getItem("profile_id") as string | null;
    if (!profileId) { router.push("/"); return; }
    const pid: string = profileId;

    function runAnalysis(allRoles: RoleSuggestion[]) {
      // Only analyse roles that aren't already cached (review page may have pre-fetched some).
      const pending = new Set(
        allRoles.filter((r) => !localStorage.getItem(CACHE_KEY(r.title))).map((r) => r.id)
      );

      // Seed scores from any caches that already exist.
      const seeded = allRoles.map((role) => {
        const hit = localStorage.getItem(CACHE_KEY(role.title));
        if (!hit) return role;
        try {
          const data: AnalyzeRoleFitResponse = JSON.parse(hit);
          const actual = (data.match_score as { overall?: number }).overall;
          return { ...role, preview_match_score: actual ?? role.preview_match_score };
        } catch { return role; }
      });

      if (!cancelled) {
        setRoles(seeded);
        setLoadingIds(pending);
        localStorage.setItem("suggested_roles", JSON.stringify(seeded));
      }

      void Promise.all(
        allRoles.filter((r) => pending.has(r.id)).map(async (role) => {
          // Double-check cache in case background pre-fetch completed between mount and now.
          const earlyHit = localStorage.getItem(CACHE_KEY(role.title));
          if (earlyHit) {
            try {
              const data: AnalyzeRoleFitResponse = JSON.parse(earlyHit);
              const actual = (data.match_score as { overall?: number }).overall;
              if (!cancelled) {
                setRoles((prev) => {
                  const updated = prev.map((r) =>
                    r.id === role.id ? { ...r, preview_match_score: actual ?? r.preview_match_score } : r
                  );
                  localStorage.setItem("suggested_roles", JSON.stringify(updated));
                  return updated;
                });
              }
            } catch { /* ignore */ }
            if (!cancelled) setLoadingIds((prev) => { const n = new Set(prev); n.delete(role.id); return n; });
            return;
          }

          try {
            const result: AnalyzeRoleFitResponse = await analyzeRoleFitWithRetry(pid, role.title, 4);
            if (cancelled) return;
            const actual = (result.match_score as { overall?: number }).overall;
            setRoles((prev) => {
              const updated = prev.map((r) =>
                r.id === role.id ? { ...r, preview_match_score: actual ?? r.preview_match_score } : r
              );
              localStorage.setItem("suggested_roles", JSON.stringify(updated));
              return updated;
            });
            localStorage.setItem(CACHE_KEY(role.title), JSON.stringify(result));
          } catch {
            // silently skip — card keeps score at 0
          } finally {
            if (!cancelled) setLoadingIds((prev) => { const n = new Set(prev); n.delete(role.id); return n; });
          }
        })
      ).then(() => {
        if (cancelled) return;
        touchSession();
        setRoles((prev) => {
          const sorted = [...prev].sort((a, b) => b.preview_match_score - a.preview_match_score);
          let changed = false;
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].preview_match_score >= sorted[i - 1].preview_match_score) {
              sorted[i] = { ...sorted[i], preview_match_score: sorted[i - 1].preview_match_score - 1 };
              changed = true;
            }
          }
          if (!changed) return prev;
          for (const role of sorted) {
            const cached = localStorage.getItem(CACHE_KEY(role.title));
            if (cached) {
              try {
                const data = JSON.parse(cached);
                if (data.match_score?.overall !== role.preview_match_score) {
                  data.match_score = { ...data.match_score, overall: role.preview_match_score };
                  localStorage.setItem(CACHE_KEY(role.title), JSON.stringify(data));
                }
              } catch { /* ignore */ }
            }
          }
          localStorage.setItem("suggested_roles", JSON.stringify(sorted));
          return sorted;
        });
      });
    }

    // Use pre-fetched roles from review page if available — skips suggestRoles call.
    const prefetched = localStorage.getItem("suggested_roles");
    if (prefetched) {
      try {
        const allRoles: RoleSuggestion[] = JSON.parse(prefetched);
        if (allRoles.length > 0) {
          setLoadingRoles(false);
          runAnalysis(allRoles);
          return () => { cancelled = true; };
        }
      } catch { /* fall through to normal fetch */ }
    }

    suggestRoles(pid)
      .then((data) => {
        const allRoles = data.roles.map((role) => ({ ...role, preview_match_score: 0 }));
        if (cancelled) return;
        localStorage.setItem("suggested_roles", JSON.stringify(allRoles));
        runAnalysis(allRoles);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load roles.");
      })
      .finally(() => {
        if (!cancelled) setLoadingRoles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleCardSelect(id: string) {
    setSelectedId(id);
    setCustomRole("");
  }

  function handleCustomInput(value: string) {
    setCustomRole(value);
    if (value.trim()) setSelectedId(null);
  }

  const activeRole = selectedId
    ? roles.find((r) => r.id === selectedId)?.title ?? selectedId
    : customRole.trim();

  async function handleAnalyze() {
    if (!activeRole) return;
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) { router.push("/"); return; }

    // Use cached result if available (all suggested roles will be cached)
    const cached = localStorage.getItem(CACHE_KEY(activeRole));
    if (cached) {
      localStorage.setItem("selected_role", activeRole);
      localStorage.setItem("analysis_result", cached);
      router.push("/dashboard");
      return;
    }

    // Fallback: full analysis for custom role or cache miss
    setAnalyzing(true);
    setError(null);

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % ANALYSIS_MESSAGES.length;
      setAnalysisMsg(ANALYSIS_MESSAGES[msgIdx]);
    }, 1800);

    try {
      const result = await analyzeRoleFit(profileId, activeRole);
      localStorage.setItem("selected_role", activeRole);
      localStorage.setItem("analysis_result", JSON.stringify(result));
      localStorage.setItem(CACHE_KEY(activeRole), JSON.stringify(result));

      // Add the custom role as a card in the sidebar (6th card)
      const actualScore = (result.match_score as { overall?: number }).overall ?? 0;
      const existing: { id: string; title: string }[] = JSON.parse(localStorage.getItem("suggested_roles") ?? "[]");
      if (!existing.some((r) => r.title === activeRole)) {
        const customEntry = {
          id: activeRole.toLowerCase().replace(/\W+/g, "_"),
          title: activeRole,
          short_description: (result.selected_role as { description?: string })?.description ?? activeRole,
          preview_match_score: actualScore,
          skills: (result.matched_skills ?? []).slice(0, 3),
        };
        localStorage.setItem("suggested_roles", JSON.stringify([...existing, customEntry]));
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      clearInterval(interval);
      setAnalyzing(false);
    }
  }

  /* Full-screen loading overlay during fallback analysis */
  if (analyzing) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 z-50" style={{ backgroundColor: "#F5F2ED" }}>
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-lg font-medium text-slate-700">{analysisMsg}</p>
      </main>
    );
  }

  const allAnalysed = loadingIds.size === 0 && roles.length > 0;
  const sortedRoles = [...roles].sort((a, b) => b.preview_match_score - a.preview_match_score);

  function handleBestMatchSort() {
    setRoles((prev) => [...prev].sort((a, b) => b.preview_match_score - a.preview_match_score));
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-12">
      <motion.div
        layout
        transition={HEADER_TRANSITION}
        className={[
          "mx-auto",
          loadingRoles
            ? "flex min-h-[72vh] max-w-2xl flex-col items-center justify-center"
            : "max-w-xl",
        ].join(" ")}
      >
        <motion.div
          layout
          transition={HEADER_TRANSITION}
          className={[
            loadingRoles ? "w-full text-center" : "w-full text-left",
            "space-y-1",
          ].join(" ")}
        >
          <TextShimmer
            as="h1"
            duration={2.8}
            spread={1.7}
            className="text-3xl font-bold text-slate-900 [--base-color:#1f2d44] [--base-gradient-color:#d5b995]"
          >
            Your Career Paths
          </TextShimmer>
          <p className="text-slate-500">
            Ranked by how well your background fits each role. Pick one to deep-dive.
          </p>
        </motion.div>

        {loadingRoles ? (
          <motion.div
            key="loading-state"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={HEADER_TRANSITION}
            className="mt-10 flex w-full justify-center"
          >
            <div className="relative w-full max-w-[240px] overflow-hidden">
              <div className="h-[2px] w-full bg-[#d9dde0]" />
              <motion.div
                className="absolute left-0 top-0 h-[2px] w-[56%] bg-[#7f94a5]"
                initial={{ x: "-75%" }}
                animate={{ x: "220%" }}
                transition={{ duration: 1.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="loaded-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            className="mt-8 space-y-6"
          >
            {/* Sort label + analysis status */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBestMatchSort}
                className="flex items-center gap-1 text-lg font-medium text-slate-400 transition-colors hover:text-slate-600"
              >
                ↑↓ Best match
              </button>
              {!allAnalysed && loadingIds.size > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-[#7f94a5]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4c6b84]" />
                  Scoring {loadingIds.size} role{loadingIds.size > 1 ? "s" : ""}…
                </span>
              )}
              {allAnalysed && (
                <span className="text-lg font-medium text-emerald-500">✓ All scores ready</span>
              )}
            </div>

            {/* Role cards */}
            <motion.div
              layout
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.08,
                  },
                },
              }}
              className="flex flex-col gap-3"
            >
              {sortedRoles.map((role) => (
                <motion.div
                  layout
                  key={role.id}
                  variants={{
                    hidden: { opacity: 0, y: 28 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{
                    ...ROLE_LIST_TRANSITION,
                    layout: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
                  }}
                >
                  <RoleCard
                    role={role}
                    selected={selectedId === role.id}
                    onSelect={handleCardSelect}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Custom role input */}
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-slate-500">
                Or describe your own target role
              </p>
              <input
                type="text"
                value={customRole}
                onChange={(e) => handleCustomInput(e.target.value)}
                placeholder="e.g. Product Manager at a fintech startup"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!activeRole}
              className="w-full rounded-xl bg-slate-900 py-3.5 text-base font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeRole && localStorage.getItem(CACHE_KEY(activeRole))
                ? "View analysis →"
                : "Analyze my fit →"}
            </button>
          </motion.div>
        )}

        {error && (
          <p className="text-sm text-center text-red-500">{error}</p>
        )}
      </motion.div>
    </main>
  );
}
