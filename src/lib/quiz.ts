import { DOMAINS, QUESTIONS, QUESTION_MAP, type Domain, type Question } from "@/data/questions";

export type Confidence = "guessing" | "somewhat" | "very";
export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  guessing: "Guessing",
  somewhat: "Somewhat sure",
  very: "Very sure",
};

export type Attempt = { questionId: string; optionId: string; confidence: Confidence; correct: boolean; at: number };

export type Session = {
  id: string;
  startedAt: number;
  completedAt?: number;
  questionIds: string[];
  optionOrder: Record<string, string[]>;
  index: number;
  answers: Record<string, Attempt>; // diagnostic first attempts, keyed by question id
  followUps: Record<string, Attempt>; // keyed by follow-up question id
};

export type Store = { version: 1; current: Session | null; history: Session[] };
export const STORAGE_KEY = "cloud-compass:v1";
export const emptyStore = (): Store => ({ version: 1, current: null, history: [] });

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function createSession(rand: () => number = Math.random, bank: Question[] = QUESTIONS): Session {
  const picked: string[] = [];
  for (const d of DOMAINS) {
    const pool = bank.filter((q) => q.kind === "diagnostic" && q.domain === d.id);
    picked.push(...shuffle(pool, rand).slice(0, 2).map((q) => q.id));
  }
  const questionIds = shuffle(picked, rand);
  const optionOrder: Record<string, string[]> = {};
  for (const id of questionIds) {
    const q = bank.find((x) => x.id === id)!;
    optionOrder[id] = shuffle(q.options.map((o) => o.id), rand);
    if (q.pairedQuestionId) {
      const f = bank.find((x) => x.id === q.pairedQuestionId);
      if (f) optionOrder[f.id] = shuffle(f.options.map((o) => o.id), rand);
    }
  }
  return { id: `s-${Date.now()}-${Math.floor(rand() * 1e6)}`, startedAt: Date.now(), questionIds, optionOrder, index: 0, answers: {}, followUps: {} };
}

/** Records a diagnostic first attempt. Ignores resubmissions (locked). */
export function submitDiagnostic(s: Session, questionId: string, optionId: string, confidence: Confidence): Session {
  const q = QUESTION_MAP[questionId];
  if (!q || q.kind !== "diagnostic" || !s.questionIds.includes(questionId) || s.answers[questionId]) return s;
  if (!q.options.some((o) => o.id === optionId)) return s;
  return { ...s, answers: { ...s.answers, [questionId]: { questionId, optionId, confidence, correct: optionId === q.correctOptionId, at: Date.now() } } };
}

export function submitFollowUp(s: Session, followUpId: string, optionId: string, confidence: Confidence): Session {
  const f = QUESTION_MAP[followUpId];
  if (!f || f.kind !== "follow-up" || s.followUps[followUpId]) return s;
  const parent = s.questionIds.find((id) => QUESTION_MAP[id]?.pairedQuestionId === followUpId);
  if (!parent || !s.answers[parent]) return s;
  if (!f.options.some((o) => o.id === optionId)) return s;
  return { ...s, followUps: { ...s.followUps, [followUpId]: { questionId: followUpId, optionId, confidence, correct: optionId === f.correctOptionId, at: Date.now() } } };
}

export type Tally = { correct: number; total: number };
export type SessionStats = {
  diagnostic: Tally;
  byDomain: Record<Domain, Tally>;
  confidence: Record<Confidence, Tally>;
  followUp: Tally;
  revisit: { concept: string; reason: string; questionId: string }[];
};

const tally = (): Tally => ({ correct: 0, total: 0 });

export function computeStats(s: Session): SessionStats {
  const byDomain = Object.fromEntries(DOMAINS.map((d) => [d.id, tally()])) as Record<Domain, Tally>;
  const confidence: Record<Confidence, Tally> = { guessing: tally(), somewhat: tally(), very: tally() };
  const diagnostic = tally();
  const revisit: SessionStats["revisit"] = [];
  for (const id of s.questionIds) {
    const a = s.answers[id];
    const q = QUESTION_MAP[id];
    if (!a || !q) continue;
    diagnostic.total++;
    byDomain[q.domain].total++;
    confidence[a.confidence].total++;
    if (a.correct) {
      diagnostic.correct++;
      byDomain[q.domain].correct++;
      confidence[a.confidence].correct++;
      if (a.confidence === "guessing") revisit.push({ concept: q.concept, reason: "Correct, but marked as a guess", questionId: id });
    } else {
      revisit.push({
        concept: q.concept,
        reason: a.confidence === "very" ? "Incorrect while very sure — possible misconception" : "Incorrect",
        questionId: id,
      });
    }
  }
  const followUp = tally();
  for (const a of Object.values(s.followUps)) {
    followUp.total++;
    if (a.correct) followUp.correct++;
  }
  return { diagnostic, byDomain, confidence, followUp, revisit };
}

export function aggregateHistory(history: Session[]) {
  const byDomain = Object.fromEntries(DOMAINS.map((d) => [d.id, tally()])) as Record<Domain, Tally>;
  const byConcept: Record<string, Tally & { domain: Domain }> = {};
  for (const q of QUESTIONS) if (q.kind === "diagnostic") byConcept[q.concept] ??= { ...tally(), domain: q.domain };
  const diagnostic = tally();
  const followUp = tally();
  for (const s of history) {
    const st = computeStats(s);
    diagnostic.correct += st.diagnostic.correct;
    diagnostic.total += st.diagnostic.total;
    followUp.correct += st.followUp.correct;
    followUp.total += st.followUp.total;
    for (const d of DOMAINS) {
      byDomain[d.id].correct += st.byDomain[d.id].correct;
      byDomain[d.id].total += st.byDomain[d.id].total;
    }
    for (const [id, a] of Object.entries(s.answers)) {
      const q = QUESTION_MAP[id];
      if (!q) continue;
      byConcept[q.concept]!.total++;
      if (a.correct) byConcept[q.concept]!.correct++;
    }
  }
  return { diagnostic, followUp, byDomain, byConcept };
}

export const pct = (t: Tally) => (t.total ? Math.round((t.correct / t.total) * 100) : null);

// ---------- Storage ----------
function isAttempt(x: unknown): x is Attempt {
  const a = x as Attempt;
  return !!a && typeof a.questionId === "string" && typeof a.optionId === "string" && typeof a.correct === "boolean" && ["guessing", "somewhat", "very"].includes(a.confidence);
}
function validSession(x: unknown): Session | null {
  const s = x as Session;
  if (!s || typeof s !== "object" || typeof s.id !== "string" || !Array.isArray(s.questionIds)) return null;
  if (!s.questionIds.every((id) => typeof id === "string" && QUESTION_MAP[id]?.kind === "diagnostic")) return null;
  if (typeof s.index !== "number" || s.index < 0 || s.index >= s.questionIds.length) return null;
  const answers = s.answers && typeof s.answers === "object" ? s.answers : {};
  const followUps = s.followUps && typeof s.followUps === "object" ? s.followUps : {};
  if (!Object.values(answers).every(isAttempt) || !Object.values(followUps).every(isAttempt)) return null;
  return { ...s, answers, followUps, optionOrder: s.optionOrder && typeof s.optionOrder === "object" ? s.optionOrder : {} };
}

export function parseStore(raw: string | null): Store {
  if (!raw) return emptyStore();
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return emptyStore();
    return {
      version: 1,
      current: data.current ? validSession(data.current) : null,
      history: Array.isArray(data.history) ? data.history.map(validSession).filter(Boolean) as Session[] : [],
    };
  } catch {
    return emptyStore();
  }
}

export function loadStore(): Store {
  try {
    return parseStore(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyStore();
  }
}
export function saveStore(s: Store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
export function clearStore() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
