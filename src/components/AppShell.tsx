import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/practice", label: "Practice" },
  { to: "/progress", label: "Progress" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Compass className="size-5 text-primary" aria-hidden />
            <span>Cloud Compass</span>
          </Link>
          <nav aria-label="Main" className="flex gap-1 text-sm">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-surface hover:text-foreground"
                activeProps={{ className: "rounded-md px-3 py-2 bg-accent text-accent-foreground font-medium" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t bg-background">
        <div className="mx-auto max-w-4xl space-y-1 px-4 py-4 text-xs text-muted-foreground">
          <p>Unofficial AZ-900 practice tool. Not affiliated with or endorsed by Microsoft.</p>
          <p>Prototype question bank — content review pending. Progress is stored only in this browser on this device.</p>
        </div>
      </footer>
    </div>
  );
}

export function Meter({ value, label }: { value: number | null; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? 0}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full bg-primary" style={{ width: `${value ?? 0}%` }} />
    </div>
  );
}
