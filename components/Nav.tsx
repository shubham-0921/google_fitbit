"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FullscreenButton } from "./FullscreenButton";
import { SyncButton } from "./SyncButton";

export function Nav({ initials, email }: { initials: string; email?: string }) {
  const path = usePathname();
  const tab = (href: string, label: string) => (
    <Link href={href} className={`pill${path.startsWith(href) ? " on" : ""}`}>
      {label}
    </Link>
  );
  return (
    <nav className="nav">
      <div className="nav-brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        TRACE
      </div>
      {tab("/running", "Running")}
      {tab("/sleep", "Sleep")}
      <div className="nav-right">
        <SyncButton />
        <FullscreenButton />
        <div className="avatar" title={email}>{initials}</div>
        <a className="pill" href="/api/auth/logout" style={{ minHeight: 32, padding: "0 12px", fontSize: 12 }}>
          Sign out
        </a>
      </div>
    </nav>
  );
}
