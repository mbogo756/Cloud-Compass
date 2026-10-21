import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Meter } from "@/components/AppShell";
import { DOMAINS, domainLabel } from "@/data/questions";
import { useStore } from "@/lib/use-store";
import { aggregateHistory, computeStats, pct } from "@/lib/quiz";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Cloud Compass" },
      { name: "description", content: "Past AZ-900 practice sessions and topic performance from diagnostic attempts." },
      { property: "og:title", content: "Progress — Cloud Compass" },
      { property: "og:description", content: "Track AZ-900 practice progress on this device." },
    ],
  }),
  component: Progress,
});

function Progress() {
  const { store, ready, reset } = useStore();
  const [confirming, setConfirming] = useState(false);
  if (!ready) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  const agg = aggregateHistory(store.history);
  const hasData = store.history.length > 0 || !!store.current;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
          <p className="text-sm text-muted-foreground">Based on completed sessions stored in this browser.</p>
        </div>

        {store.history.length === 0 ? (
          <div className="panel p-6 text-center">
            <p className="font-medium">No completed sessions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Complete a six-question session to see topic performance here.</p>
            <Link to="/practice" className="btn btn-primary mt-4">{store.current ? "Resume practice" : "Start practice"}</Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Diagnostic attempts (all sessions)</p>
                <p className="mt-1 text-2xl font-semibold">{agg.diagnostic.correct} / {agg.diagnostic.total}</p>
                <p className="text-xs text-muted-foreground">{pct(agg.diagnostic)}% correct on first attempts</p>
              </div>
              <div className="panel p-4">
                <p className="text-xs text-muted-foreground">Follow-up attempts (tracked separately)</p>
                <p className="mt-1 text-2xl font-semibold">{agg.followUp.total ? `${agg.followUp.correct} / ${agg.followUp.total}` : "None"}</p>
                <p className="text-xs text-muted-foreground">Not included in diagnostic results</p>
              </div>
            </div>

            <section className="panel p-5">
              <h2 className="text-sm font-semibold">Topic performance (diagnostic only)</h2>
              <ul className="mt-3 space-y-3">
                {DOMAINS.map((d) => {
                  const t = agg.byDomain[d.id];
                  const p = pct(t);
                  return (
                    <li key={d.id}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span>{d.label}</span>
                        <span className="text-muted-foreground">{p === null ? "Not assessed" : `${p}% · ${t.correct} of ${t.total}`}</span>
                      </div>
                      <Meter value={p} label={`${d.label} accuracy`} />
                    </li>
                  );
                })}
              </ul>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">By concept</h3>
              <ul className="mt-2 divide-y text-sm">
                {Object.entries(agg.byConcept).map(([c, t]) => (
                  <li key={c} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="min-w-0 break-words">{c} <span className="text-xs text-muted-foreground">· {domainLabel(t.domain)}</span></span>
                    <span className="min-w-0 text-muted-foreground">{t.total ? `${t.correct} of ${t.total} correct` : "Not assessed"}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel p-5">
              <h2 className="text-sm font-semibold">Completed sessions</h2>
              <ul className="mt-2 divide-y text-sm">
                {[...store.history].reverse().map((s) => {
                  const st = computeStats(s);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="min-w-0 break-words">{new Date(s.completedAt ?? s.startedAt).toLocaleString()}</span>
                      <span className="flex min-w-0 flex-wrap items-center gap-x-3 text-muted-foreground">
                        Diagnostic {st.diagnostic.correct}/{st.diagnostic.total}
                        {st.followUp.total > 0 && ` · Follow-up ${st.followUp.correct}/${st.followUp.total}`}
                        <Link to="/results" search={{ session: s.id }} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">Details</Link>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}

        {hasData && (
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">Reset progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">Removes your current session and all session history from this browser. This can't be undone.</p>
            {confirming ? (
              <div className="mt-3 flex flex-wrap items-center gap-3" role="alert">
                <span className="text-sm font-medium">Delete all practice data?</span>
                <button className="btn btn-danger" onClick={() => { reset(); setConfirming(false); }}>Yes, reset everything</button>
                <button className="btn btn-outline" onClick={() => setConfirming(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-outline mt-3" onClick={() => setConfirming(true)}>Reset progress</button>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
