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
