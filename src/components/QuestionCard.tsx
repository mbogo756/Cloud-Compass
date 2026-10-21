import { useId, useState, type RefObject } from "react";
import { CheckCircle2, ExternalLink, Lightbulb, XCircle } from "lucide-react";
import { domainLabel, type Question } from "@/data/questions";
import { CONFIDENCE_LABELS, type Attempt, type Confidence } from "@/lib/quiz";
import { getCoaching } from "@/lib/coaching";
import { cn } from "@/lib/utils";

type Props = {
  question: Question;
  order: string[] | undefined;
  attempt: Attempt | undefined;
  onSubmit: (optionId: string, confidence: Confidence) => void;
  label: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

export function QuestionCard({ question, order, attempt, onSubmit, label, headingRef }: Props) {
  const uid = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const locked = !!attempt;
  const ids = order && order.length === question.options.length ? order : question.options.map((o) => o.id);
  const options = ids.map((id) => question.options.find((o) => o.id === id)!).filter(Boolean);
  const chosen = attempt?.optionId ?? selected;

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby={`${uid}-q`}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded border bg-surface px-2 py-0.5 font-medium text-muted-foreground">{label}</span>
        <span className="rounded bg-accent px-2 py-0.5 font-medium text-accent-foreground">{domainLabel(question.domain)}</span>
      </div>
      <h2
        id={`${uid}-q`}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className={cn(
          "text-base font-medium leading-relaxed text-foreground sm:text-lg",
          headingRef && "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        )}
      >
        {question.scenario}
      </h2>

      <form
        className="mt-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!locked && selected && confidence) onSubmit(selected, confidence);
        }}
      >
        <fieldset disabled={locked}>
          <legend className="sr-only">Answer choices</legend>
          <div className="space-y-2">
            {options.map((o, i) => {
              const isCorrect = locked && o.id === question.correctOptionId;
              const isWrongPick = locked && o.id === attempt!.optionId && !attempt!.correct;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    !locked && "hover:bg-surface",
                    !locked && chosen === o.id && "border-primary bg-primary-soft",
                    isCorrect && "border-success bg-success-soft",
                    isWrongPick && "border-destructive bg-destructive-soft",
                    locked && "cursor-default",
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-opt`}
                    value={o.id}
                    checked={chosen === o.id}
                    onChange={() => setSelected(o.id)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span className="min-w-0 flex-1 break-words">
                    <span className="mr-1 font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                    {o.text}
                  </span>
                  {isCorrect && (
                    <span className="flex items-center gap-1 text-xs font-medium text-success-text">
                      <CheckCircle2 className="size-4" aria-hidden /> Correct answer
                    </span>
                  )}
                  {isWrongPick && (
                    <span className="flex items-center gap-1 text-xs font-medium text-destructive-text">
                      <XCircle className="size-4" aria-hidden /> Your answer
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset disabled={locked}>
          <legend className="mb-2 text-sm font-medium text-foreground">How confident are you?</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CONFIDENCE_LABELS) as Confidence[]).map((c) => {
              const active = (attempt?.confidence ?? confidence) === c;
              return (
                <label
                  key={c}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    active ? "border-primary bg-primary-soft font-medium text-accent-foreground" : "hover:bg-surface",
                    locked && "cursor-default",
                  )}
                >
                  <input type="radio" className="sr-only" name={`${uid}-conf`} value={c} checked={active} onChange={() => setConfidence(c)} />
                  {CONFIDENCE_LABELS[c]}
                </label>
              );
            })}
          </div>
        </fieldset>

        {!locked && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={!selected || !confidence}>
              Submit answer
            </button>
            {(!selected || !confidence) && (
              <span className="text-xs text-muted-foreground">Choose an answer and a confidence level to submit.</span>
            )}
          </div>
        )}
      </form>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {attempt &&
          `${attempt.correct ? "Correct" : "Incorrect"}. ${getCoaching(question, attempt).headline}. Your confidence: ${CONFIDENCE_LABELS[attempt.confidence]}.`}
      </span>
      {attempt && <Feedback question={question} attempt={attempt} />}
    </section>
  );
}

function Feedback({ question, attempt }: { question: Question; attempt: Attempt }) {
  const coaching = getCoaching(question, attempt);
  const correctText = question.options.find((o) => o.id === question.correctOptionId)?.text;
  const wrong = !attempt.correct ? question.explanationsForWrongOptions[attempt.optionId] : null;
  return (
    <div className="mt-6 space-y-4 border-t pt-5">
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border p-3",
          attempt.correct ? "border-success bg-success-soft" : "border-destructive bg-destructive-soft",
        )}
      >
        {attempt.correct ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-text" aria-hidden />
        ) : (
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive-text" aria-hidden />
        )}
        <div className="text-sm">
          <p className={cn("font-semibold", attempt.correct ? "text-success-text" : "text-destructive-text")}>
            {attempt.correct ? "Correct" : "Incorrect"} · {coaching.headline}
          </p>
          <p className="mt-1 text-foreground">{coaching.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">Your confidence: {CONFIDENCE_LABELS[attempt.confidence]}</p>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-medium text-foreground">Correct answer</dt>
          <dd className="mt-0.5 text-foreground">{correctText}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Why it's correct</dt>
          <dd className="mt-0.5 text-muted-foreground">{question.explanation}</dd>
        </div>
        {wrong && (
          <div>
            <dt className="font-medium text-foreground">Why your answer doesn't fit</dt>
            <dd className="mt-0.5 text-muted-foreground">{wrong}</dd>
          </div>
        )}
      </dl>

      <div className="rounded-md bg-surface p-3 text-sm">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <Lightbulb className="size-4 text-warning-text" aria-hidden /> Concept: {question.concept}
        </p>
        <p className="mt-1 text-muted-foreground">{question.conceptSummary}</p>
      </div>

      <a
        href={question.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 max-w-full flex-wrap items-center gap-1 py-1 text-sm font-medium text-primary break-words hover:underline"
      >
        Microsoft Learn: {question.sourceTitle} <ExternalLink className="size-3.5" aria-hidden />
        <span className="sr-only">(opens in new tab)</span>
      </a>
    </div>
  );
}
