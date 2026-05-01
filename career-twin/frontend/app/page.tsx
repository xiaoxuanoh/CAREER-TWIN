"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UploadZone } from "@/components/upload/UploadZone";
import { uploadCV } from "@/lib/api";
import { CareerTwinIntro } from "@/components/intro/CareerTwinIntro";
import type { UploadResponse } from "@/lib/types";
import { clearSession, touchSession } from "@/lib/session";

const LOADING_MESSAGES = [
  "Reading your CV…",
  "Identifying your experience…",
  "Structuring your profile…",
];

export default function UploadPage() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Lock body scroll while intro is active
  useEffect(() => {
    if (showIntro) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showIntro]);

  useEffect(() => {
    const id = window.setTimeout(() => setShowIntro(false), 5000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const syncViewport = () => setIsMobile(mq.matches);

    syncViewport();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", syncViewport);
      return () => mq.removeEventListener("change", syncViewport);
    }

    mq.addListener(syncViewport);
    return () => mq.removeListener(syncViewport);
  }, []);

  async function handleUpload(file: File) {
    setIsLoading(true);
    setError(null);

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 1800);

    try {
      const result: UploadResponse = await uploadCV(file);
      clearInterval(interval);
      clearSession();
      localStorage.setItem("upload_result", JSON.stringify(result));
      touchSession();
      router.push("/review");
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Intro transition — sits above the upload page (z-40) */}
      {showIntro && (
        <CareerTwinIntro onComplete={() => setShowIntro(false)} />
      )}

      {/* Upload page */}
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-10 sm:py-16">

        {/* Decorative arc — matches loading screen */}
        <svg
          className="fixed inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          style={{ zIndex: 0 }}
        >
          <circle
            cx={isMobile ? "50%" : "72%"} cy="50%" r={isMobile ? "58%" : "42%"}
            fill="none"
            stroke="#D9D4CC"
            strokeWidth="1"
            opacity="0.7"
          />
        </svg>

        {/* Orbiting dot — matches loading screen */}
        <motion.div
          className="fixed pointer-events-none"
          style={{ left: isMobile ? "50%" : "72%", top: "50%", width: 0, height: 0, zIndex: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <div
            className={["absolute rounded-full", isMobile ? "h-7 w-7" : "h-10 w-10"].join(" ")}
            style={{
              backgroundColor: "#C4A882",
              boxShadow: "0 0 20px rgba(196,168,130,1), 0 0 40px rgba(196,168,130,0.6), 0 0 80px rgba(196,168,130,0.25)",
              transform: isMobile
                ? "translate(-50%, calc(-34vmin - 50%))"
                : "translate(-50%, calc(-45vmin - 50%))",
            }}
          />
        </motion.div>

        {/* Content */}
        <div
          className="relative w-full max-w-lg space-y-5 rounded-[2rem] border border-white/60 bg-[#f8f4ed]/88 px-4 py-6 shadow-[0_18px_60px_rgba(80,67,48,0.08)] backdrop-blur-[2px] sm:space-y-8 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-0"
          style={{ zIndex: 1 }}
        >
          <div className="space-y-2 text-center sm:space-y-3">
            <motion.h1
              className="text-[2.15rem] font-bold tracking-tight sm:text-4xl"
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
              Career Twin
            </motion.h1>
            <p className="mx-auto max-w-sm px-2 text-sm leading-6 text-slate-500 sm:max-w-none sm:px-0 sm:text-lg sm:leading-normal">
              Upload your CV and discover your ideal career path.
            </p>
          </div>

          <UploadZone
            onUpload={handleUpload}
            isLoading={isLoading}
            loadingMessage={loadingMsg}
          />

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

          <p className="mx-auto max-w-[18rem] text-center text-[11px] leading-5 text-slate-400 sm:max-w-none sm:text-xs sm:leading-normal">
            Your CV is processed securely and never stored permanently.
          </p>
        </div>
      </main>
    </>
  );
}
