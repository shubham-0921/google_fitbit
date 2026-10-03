"use client";
import { useEffect, useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

function toggle() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
}

export function FullscreenButton() {
  const active = useSyncExternalStore(subscribe, () => !!document.fullscreenElement, () => false);
  const supported = useSyncExternalStore(() => () => {}, () => document.fullscreenEnabled, () => false);

  // Make F11 use the same toggle (the browser's own F11 is not controllable by pages).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!supported) return null; // e.g. iPhone Safari has no Fullscreen API

  const label = active ? "Exit full screen (F11)" : "Full screen (F11)";
  return (
    <button type="button" className="pill icon-btn" onClick={toggle} title={label} aria-label={label} aria-pressed={active}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {active ? (
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        ) : (
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        )}
      </svg>
    </button>
  );
}
