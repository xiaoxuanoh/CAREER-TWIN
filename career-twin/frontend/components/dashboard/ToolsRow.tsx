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
