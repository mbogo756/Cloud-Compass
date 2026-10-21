import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Target } from "lucide-react";
import { AppShell, Meter } from "@/components/AppShell";
import { QuestionCard } from "@/components/QuestionCard";
import { QUESTION_MAP } from "@/data/questions";
import { useStore } from "@/lib/use-store";
import { createSession, submitDiagnostic, submitFollowUp } from "@/lib/quiz";
import { getCoaching } from "@/lib/coaching";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice — Cloud Compass" },
      { name: "description", content: "Answer AZ-900 scenario questions, rate your confidence, and get targeted feedback." },
      { property: "og:title", content: "Practice — Cloud Compass" },
      { property: "og:description", content: "AZ-900 diagnostic practice with confidence-aware feedback." },
    ],
  }),
  component: Practice,
});

function Practice() {
  const { store, ready, update } = useStore();
  const navigate = useNavigate();
  const s = store.current;
  const [showFollowUp, setShowFollowUp] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const followUpHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const qid = s?.questionIds[s.index];
  const activeAttempt = qid ? s?.answers[qid] : undefined;
  const activeFollowUpId = qid ? QUESTION_MAP[qid]?.pairedQuestionId : undefined;
  const activeFollowUpAttempt = activeFollowUpId ? s?.followUps[activeFollowUpId] : undefined;

  useEffect(() => {
    setShowFollowUp(false);
    headingRef.current?.focus();
  }, [qid]);

  useEffect(() => {
    if (showFollowUp) followUpHeadingRef.current?.focus();
  }, [showFollowUp]);

  useEffect(() => {
    if (activeAttempt || activeFollowUpAttempt) nextButtonRef.current?.focus();
  }, [activeAttempt, activeFollowUpAttempt]);

  if (!ready) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  if (!s || !qid) {
    return (
      <AppShell>
        <div className="panel p-6 text-center">
          <h1 className="text-lg font-semibold">No practice session in progress</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start a six-question diagnostic to begin.</p>
          <button
            className="btn btn-primary mt-4"
            onClick={() => update((st) => ({ ...st, current: createSession() }))}
          >
            Start practice
          </button>
        </div>
      </AppShell>
    );
  }

  const q = QUESTION_MAP[qid]!;
  const attempt = activeAttempt;
  const follow = q.pairedQuestionId ? QUESTION_MAP[q.pairedQuestionId] : undefined;
  const followAttempt = activeFollowUpAttempt;
  const isLast = s.index === s.questionIds.length - 1;
  const done = Object.keys(s.answers).length;
  const coaching = attempt ? getCoaching(q, attempt) : null;

  const next = () => {
    if (!attempt) return;
    if (isLast) {
      const completed = { ...s, completedAt: Date.now() };
      update((st) => (st.current?.id === s.id ? { ...st, current: null, history: [...st.history, completed] } : st));
      navigate({ to: "/results", search: { session: s.id } });
    } else {
      update((st) => (st.current ? { ...st, current: { ...st.current, index: st.current.index + 1 } } : st));
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            Question {s.index + 1} of {s.questionIds.length}
          </h1>
          <Link to="/" className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground hover:underline">
            Save and exit
          </Link>
        </div>
        <div>
          <Meter value={(done / s.questionIds.length) * 100} label="Session progress" />
          <p className="mt-1 text-xs text-muted-foreground">{done} of {s.questionIds.length} diagnostic questions answered</p>
        </div>

        <QuestionCard
          key={qid}
          question={q}
          order={s.optionOrder[qid]}
          attempt={attempt}
          label="Diagnostic"
          onSubmit={(o, c) => update((st) => (st.current ? { ...st, current: submitDiagnostic(st.current, qid, o, c) } : st))}
        />

        {attempt && follow && !showFollowUp && !followAttempt && (
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 flex-1 items-start gap-2 text-sm">
              <Target className="mt-0.5 size-4 text-primary" aria-hidden />
              <span className="min-w-0 break-words">
                <span className="font-medium">Practice this concept</span>
                <span className="text-muted-foreground"> — a different question on {q.concept}. Optional; doesn't affect your diagnostic score.</span>
                {coaching?.suggestFollowUp && <span className="ml-1 font-medium text-accent-foreground">Recommended.</span>}
              </span>
            </div>
            <button className="btn btn-outline shrink-0" onClick={() => setShowFollowUp(true)}>Practice this concept</button>
          </div>
        )}
        {attempt && !follow && (
          <p className="text-sm text-muted-foreground">No follow-up question is available for this concept yet.</p>
        )}

        {follow && (showFollowUp || followAttempt) && (
          <QuestionCard
            key={follow.id}
            question={follow}
            order={s.optionOrder[follow.id]}
            attempt={followAttempt}
            headingRef={followUpHeadingRef}
            label="Follow-up · not scored in diagnostic"
            onSubmit={(o, c) => update((st) => (st.current ? { ...st, current: submitFollowUp(st.current, follow.id, o, c) } : st))}
          />
        )}

        {attempt && (
          <div className="flex justify-end">
            <button ref={nextButtonRef} className="btn btn-primary" onClick={next}>
              {isLast ? "See results" : "Next question"} <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
