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
