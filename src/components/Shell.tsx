import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Shell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4">
        <Link to="/" className="min-w-0">
          <span className="font-display truncate text-xl tracking-tight">Looxrater</span>
        </Link>
        <Link to="/account" className="eyebrow shrink-0 hover:text-foreground">
          Account
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      {footer && (
        <footer className="mt-12 border-t border-border pt-5 text-[11px] leading-relaxed text-muted-foreground">
          Looxrater reports geometric measurements from facial landmarks. Scores describe how
          closely proportions match classical reference ratios — they are not an objective measure of
          attractiveness, health, or worth. Adults only.
        </footer>
      )}
    </div>
  );
}

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-muted-foreground ${className}`}>
      Not a measure of attractiveness — a conformity figure against classical proportion references.
    </p>
  );
}
