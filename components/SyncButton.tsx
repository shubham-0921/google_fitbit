"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

function ago(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** Page data is fetched live from Google Health on every render, so "sync" = re-render with fresh data. */
export function SyncButton() {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [syncedAt, setSyncedAt] = useState(() => Date.now());
  const [, tick] = useState(0);
  const wasPending = useRef(false);

  // Navigating to another tab also fetches fresh data.
  const lastPath = useRef(path);
  useEffect(() => {
    if (lastPath.current !== path) {
      lastPath.current = path;
      setSyncedAt(Date.now());
    }
  }, [path]);
  useEffect(() => {
    if (wasPending.current && !pending) setSyncedAt(Date.now());
    wasPending.current = pending;
  }, [pending]);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <span
        className="text-muted sync-status"
        title={`Last synced ${new Date(syncedAt).toLocaleTimeString()}`}
        suppressHydrationWarning
      >
        {pending ? "Syncing…" : syncedAt ? `Synced ${ago(syncedAt)}` : " "}
      </span>
      <button
        type="button"
        className="pill sync-btn"
        onClick={() => start(() => router.refresh())}
        disabled={pending}
        aria-busy={pending}
      >
        <svg className={pending ? "spin" : undefined} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
        Sync
      </button>
    </>
  );
}
