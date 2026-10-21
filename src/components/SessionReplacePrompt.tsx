import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import type { Session } from "@/lib/quiz";

type SessionReplacePromptProps = {
  unfinishedSession: Session;
  onDiscardAndStart: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

export function SessionReplacePrompt({
  unfinishedSession,
  onDiscardAndStart,
  onCancel,
  title = "Replace unfinished session?",
  description,
}: SessionReplacePromptProps) {
  const answered = Object.keys(unfinishedSession.answers).length;
  const total = unfinishedSession.questionIds.length;
  const defaultDesc = `You have an unfinished practice session (${answered} of ${total} answered). Starting a new session will discard your unfinished answers. Completed sessions in your history remain saved.`;

  return (
    <div
      role="alert"
      aria-label="Confirm new session replacement"
      className="panel mt-4 border-warning bg-warning-soft/30 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning-text" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description ?? defaultDesc}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-danger h-8 px-3 text-xs"
              onClick={onDiscardAndStart}
            >
              Discard and start new
            </button>
            <Link
              to="/practice"
              className="btn btn-primary h-8 px-3 text-xs"
            >
              Resume practice
            </Link>
            <button
              type="button"
              className="btn btn-outline h-8 px-3 text-xs"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
