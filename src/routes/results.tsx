import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell, Meter } from "@/components/AppShell";
import { SessionReplacePrompt } from "@/components/SessionReplacePrompt";
import { DOMAINS, QUESTION_MAP } from "@/data/questions";
import { useStore } from "@/lib/use-store";
import { CONFIDENCE_LABELS, computeStats, createSession, pct, type Confidence } from "@/lib/quiz";

export const Route = createFileRoute("/results")({
  validateSearch: (s: Record<string, unknown>) => ({ session: typeof s["session"] === "string" ? s["session"] : undefined }),
  head: () => ({
    meta: [
      { title: "Session results — Cloud Compass" },
      { name: "description", content: "Your diagnostic score, topic accuracy, confidence patterns, and concepts to revisit." },
      { property: "og:title", content: "Session results — Cloud Compass" },
      { property: "og:description", content: "Review your AZ-900 practice session results." },
    ],
  }),
  component: Results,
});

function Results() {
  const { session: sid } = Route.useSearch();
  const { store, ready, update } = useStore();
  const navigate = useNavigate();
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  if (!ready) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  const s = (sid && store.history.find((h) => h.id === sid)) || store.history[store.history.length - 1];
  if (!s) {
    return (
      <AppShell>
        <div className="panel p-6 text-center">
          <h1 className="text-lg font-semibold">No completed sessions yet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Finish a practice session to see results here.</p>
          <Link to="/practice" className="btn btn-primary mt-4">Go to practice</Link>
        </div>
      </AppShell>
    );
  }
  const st = computeStats(s);
  const unfinishedSession = store.current;

  const startNew = () => {
    update((x) => ({ ...x, current: createSession() }));
    navigate({ to: "/practice" });
  };

  const handleStartAnotherClick = () => {
    if (unfinishedSession) {
      setConfirmingReplace(true);
    } else {
      startNew();
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session results</h1>
          <p className="text-sm text-muted-foreground">
            Completed {new Date(s.completedAt ?? s.startedAt).toLocaleString()}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Diagnostic score (first attempts)" value={`${st.diagnostic.correct} / ${st.diagnostic.total}`} sub={`${pct(st.diagnostic) ?? 0}% correct`} />
          <Stat label="Diagnostic questions answered" value={`${st.diagnostic.total}`} sub={`of ${s.questionIds.length} in session`} />
          <Stat label="Follow-up practice (separate)" value={st.followUp.total ? `${st.followUp.correct} / ${st.followUp.total}` : "None"} sub="Not included in diagnostic score" />
        </div>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Accuracy by topic</h2>
          <ul className="mt-3 space-y-3">
            {DOMAINS.map((d) => {
              const t = st.byDomain[d.id];
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
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Confidence patterns</h2>
          <p className="mt-1 text-xs text-muted-foreground">Self-reported confidence. Useful for reflection; not a measure of mastery or exam readiness.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-1 font-medium">Confidence</th><th className="py-1 font-medium">Answered</th><th className="py-1 font-medium">Correct</th></tr>
              </thead>
              <tbody>
                {(Object.keys(CONFIDENCE_LABELS) as Confidence[]).map((c) => (
                  <tr key={c} className="border-t">
                    <td className="py-1.5">{CONFIDENCE_LABELS[c]}</td>
                    <td className="py-1.5">{st.confidence[c].total}</td>
                    <td className="py-1.5">{st.confidence[c].total ? `${st.confidence[c].correct} (${pct(st.confidence[c])}%)` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Concepts to revisit</h2>
          {st.revisit.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing flagged — every answer was correct with at least some confidence.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {st.revisit.map((r) => (
                <li key={r.questionId} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{r.concept}</span>
                  <span className="text-xs text-muted-foreground">{r.reason} · <a className="text-primary hover:underline" href={QUESTION_MAP[r.questionId]?.sourceUrl} target="_blank" rel="noreferrer">Microsoft Learn</a></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Review answers</h2>
          <ol className="mt-3 space-y-2">
            {s.questionIds.map((id, i) => {
              const q = QUESTION_MAP[id]!;
              const a = s.answers[id];
              const f = q.pairedQuestionId ? s.followUps[q.pairedQuestionId] : undefined;
              return (
                <li key={id}>
                  <details className="rounded-md border p-3 text-sm">
                    <summary className="flex cursor-pointer items-start gap-2">
                      {a?.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-text" aria-label="Correct" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive-text" aria-label="Incorrect" />}
                      <span className="flex-1">Q{i + 1}. {q.concept}</span>
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-6 text-muted-foreground">
                      <p className="text-foreground">{q.scenario}</p>
                      <p>Your answer: {q.options.find((o) => o.id === a?.optionId)?.text ?? "—"} ({a ? CONFIDENCE_LABELS[a.confidence] : "—"})</p>
                      <p>Correct answer: {q.options.find((o) => o.id === q.correctOptionId)?.text}</p>
                      <p>{q.explanation}</p>
                      {f && <p>Follow-up: {f.correct ? "Correct" : "Incorrect"}</p>}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="space-y-3">
          {unfinishedSession && confirmingReplace ? (
            <SessionReplacePrompt
              unfinishedSession={unfinishedSession}
              onDiscardAndStart={() => {
                setConfirmingReplace(false);
                startNew();
              }}
              onCancel={() => setConfirmingReplace(false)}
              title="Replace unfinished session?"
              description={`You are viewing completed results, but an unfinished session is in progress (${Object.keys(unfinishedSession.answers).length} of ${unfinishedSession.questionIds.length} answered). Starting another session will discard it. Completed history remains saved.`}
            />
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={handleStartAnotherClick}>
                Start another session
              </button>
              <Link to="/progress" className="btn btn-outline">
                View progress
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
