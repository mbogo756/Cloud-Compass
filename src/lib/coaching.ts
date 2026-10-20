import type { Question } from "@/data/questions";
import type { Attempt } from "@/lib/quiz";

export type CoachingCategory =
  | "reinforce"
  | "explain-reasoning"
  | "reinforcement-practice"
  | "possible-misconception"
  | "foundational";

export type CoachingFeedback = {
  category: CoachingCategory;
  headline: string;
  message: string;
  suggestFollowUp: boolean;
  source: "authored-rules"; // a future server-side AI coach would add another source
};

/**
 * Deterministic coaching from correctness + self-reported confidence.
 * Kept behind this single function so a server-side AI coach can replace
 * or augment it later without changing the quiz UI.
 */
export function getCoaching(question: Question, attempt: Attempt): CoachingFeedback {
  const base = { source: "authored-rules" as const };
  if (attempt.correct) {
    if (attempt.confidence === "very")
      return { ...base, category: "reinforce", headline: "Solid understanding", message: "Your answer and confidence line up. Keep this mental model.", suggestFollowUp: false };
    if (attempt.confidence === "somewhat")
      return { ...base, category: "explain-reasoning", headline: "Right — here's why", message: "You were on the right track. The reasoning below can help you answer with more certainty next time.", suggestFollowUp: false };
    return { ...base, category: "reinforcement-practice", headline: "Correct, but worth reinforcing", message: `You marked this as a guess. A quick follow-up on ${question.concept.toLowerCase()} can help confirm the idea.`, suggestFollowUp: true };
  }
  if (attempt.confidence === "very")
    return { ...base, category: "possible-misconception", headline: "Possible misconception", message: "You felt very sure, so this may be a mix-up between similar concepts. That's common and very fixable — compare the options below carefully.", suggestFollowUp: true };
  return { ...base, category: "foundational", headline: "Let's build the foundation", message: "No problem — this is what practice is for. Start with the core idea below, then try a follow-up.", suggestFollowUp: true };
}
