import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Gauge, HardDrive, ListChecks } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/use-store";
import { createSession } from "@/lib/quiz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cloud Compass — Unofficial AZ-900 Practice Coach" },
      { name: "description", content: "Practice AZ-900 concepts with confidence-aware feedback and targeted follow-up questions." },
      { property: "og:title", content: "Cloud Compass — Unofficial AZ-900 Practice Coach" },
      { property: "og:description", content: "Find misconceptions and check understanding with targeted AZ-900 practice." },
    ],
  }),
  component: Index,
});

function Index() {
  const { store, ready, update } = useStore();
  const navigate = useNavigate();
  const current = store.current;
  const answered = current ? Object.keys(current.answers).length : 0;

  const start = () => {
    update((s) => ({ ...s, current: createSession() }));
    navigate({ to: "/practice" });
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-medium text-primary">Unofficial AZ-900 Practice Coach</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Cloud Compass</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A six-question diagnostic across the three AZ-900 domains. After each answer you'll see why it's right or
            wrong, the core concept, and a Microsoft Learn link — plus an optional follow-up on the same idea.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {ready && current ? (
              <>
                <Link to="/practice" className="btn btn-primary">
                  Resume practice ({answered}/{current.questionIds.length} answered)
                </Link>
                <button className="btn btn-outline" onClick={start}>
                  Start a new session
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={start} disabled={!ready}>
                Start practice
              </button>
            )}
            {ready && store.history.length > 0 && (
              <Link to="/progress" className="btn btn-outline">
                View progress
              </Link>
            )}
          </div>
          {ready && current && (
            <p className="mt-2 text-xs text-muted-foreground">Starting a new session discards the unfinished one.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: ListChecks, t: "Six diagnostic questions", d: "Two from each domain: cloud concepts, architecture and services, management and governance." },
            { icon: Gauge, t: "Pick your confidence", d: "Before submitting, choose Guessing, Somewhat sure, or Very sure. Feedback adapts — confidence is self-reported, not a mastery measure." },
            { icon: BarChart3, t: "Separate scoring", d: "Only first diagnostic attempts count toward your score. Follow-ups are tracked separately." },
            { icon: HardDrive, t: "Saved on this device", d: "Progress stays in this browser. No account needed; clearing browser data removes it." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="panel p-4">
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-2 text-sm font-semibold text-foreground">{t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
