"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ProfileForm } from "@/components/review/ProfileForm";
import { confirmProfile } from "@/lib/api";
import type { CVProfile, UploadResponse } from "@/lib/types";
import { checkAndClearIfExpired, touchSession } from "@/lib/session";

const TRUNCATED_FIELD_LABELS: Record<string, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  awards: "Awards",
  certificates: "Certifications",
  leadership: "Leadership",
};

function normaliseProfile(profile: CVProfile): { profile: CVProfile; truncated: string[] } {
  const truncated: string[] = [];
  const fields = ["experience", "education", "skills", "projects", "awards", "certificates", "leadership"] as const;
  const result = { ...profile };
  for (const field of fields) {
    if (!Array.isArray(profile[field])) {
      (result as Record<string, unknown>)[field] = [];
      truncated.push(field);
    }
  }
  return { profile: result, truncated };
}

function readUploadResult(): { profile: CVProfile | null; parseWarning: string | null; truncatedSections: string[] } {
  if (typeof window === "undefined") {
    return { profile: null, parseWarning: null, truncatedSections: [] };
  }

  const raw = localStorage.getItem("upload_result");
  if (!raw) {
    return { profile: null, parseWarning: null, truncatedSections: [] };
  }

  try {
    const data: UploadResponse = JSON.parse(raw);
    if (!data.structured) {
      return { profile: null, parseWarning: data.parse_warning ?? null, truncatedSections: [] };
    }
    const { profile, truncated } = normaliseProfile(data.structured);
    return {
      profile,
      parseWarning: data.parse_warning ?? null,
      truncatedSections: truncated,
    };
  } catch {
    return { profile: null, parseWarning: null, truncatedSections: [] };
  }
}

export default function ReviewPage() {
  const router = useRouter();
  const [{ profile, parseWarning, truncatedSections }] = useState(readUploadResult);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || checkAndClearIfExpired()) {
      router.push("/");
    }
  }, [profile, router]);

  async function handleConfirm(updated: CVProfile) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await confirmProfile(updated);
      localStorage.setItem("profile_id", result.profile_id);
      localStorage.setItem("confirmed_profile", JSON.stringify(updated));
      touchSession();
      router.push("/roles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
      setIsLoading(false);
    }
  }

  if (!profile) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--background)]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c4a882] border-t-transparent" />
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-x-hidden px-6 py-12">

      {/* Decorative arc — matches loading screen */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        style={{ zIndex: 0 }}
      >
        <circle
          cx="72%" cy="50%" r="42%"
          fill="none"
          stroke="#D9D4CC"
          strokeWidth="1"
          opacity="0.7"
        />
      </svg>

      {/* Orbiting dot — matches loading screen */}
      <motion.div
        className="fixed pointer-events-none"
        style={{ left: "72%", top: "50%", width: 0, height: 0, zIndex: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute w-10 h-10 rounded-full"
          style={{
            backgroundColor: "#C4A882",
            boxShadow: "0 0 20px rgba(196,168,130,1), 0 0 40px rgba(196,168,130,0.6), 0 0 80px rgba(196,168,130,0.25)",
            transform: "translate(-50%, calc(-45vmin - 50%))",
          }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-5xl" style={{ zIndex: 1 }}>
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-1.5">
            Career Twin
          </p>
          <motion.h1
            className="text-4xl font-bold tracking-tight"
            style={{
              backgroundImage: "linear-gradient(90deg, #1C2B3A 20%, #8A7060 38%, #C4A882 45%, #EDD9B8 50%, #C4A882 55%, #8A7060 62%, #1C2B3A 80%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            initial={{ backgroundPosition: "200% center" }}
            animate={{ backgroundPosition: "0% center" }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          >
            Review Your CV
          </motion.h1>
          <p className="text-slate-500 mt-1.5">
            Check what we extracted. Edit anything before we build your career paths.
          </p>
        </div>

        {parseWarning && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Heads up:</strong> {parseWarning}
          </div>
        )}

        {truncatedSections.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Some sections couldn&apos;t be parsed:</strong>{" "}
            {truncatedSections.map(f => TRUNCATED_FIELD_LABELS[f] ?? f).join(", ")} — these appear empty below. You can add them manually before confirming.
          </div>
        )}

        <ProfileForm
          initial={profile}
          onConfirm={handleConfirm}
          isLoading={isLoading}
        />

        {error && (
          <p className="mt-4 text-sm text-center text-red-500">{error}</p>
        )}
      </div>
    </main>
  );
}
