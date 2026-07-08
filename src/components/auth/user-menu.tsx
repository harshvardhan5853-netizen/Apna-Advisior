"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, User, ChevronDown } from "lucide-react";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground hover:bg-white/[0.06] transition-colors"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden sm:inline max-w-[100px] truncate">
          {user.fullName}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#050508]/95 backdrop-blur-xl p-1.5 shadow-2xl z-50">
          <div className="px-3 py-2 border-b border-white/5 mb-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{user.username}
            </p>
          </div>

          <div className="px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="size-3.5" />
              {user.email}
            </div>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
