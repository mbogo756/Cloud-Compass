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
const VALID_CONFIDENCES = new Set<string>(["guessing", "somewhat", "very"]);

function isValidTimestamp(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val > 0;
}

function isValidConfidence(val: unknown): val is Confidence {
  return typeof val === "string" && VALID_CONFIDENCES.has(val);
}

type RawAttempt = {
  questionId?: unknown;
  optionId?: unknown;
  confidence?: unknown;
  correct?: unknown;
  at?: unknown;
};

type RawSession = {
  id?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  questionIds?: unknown;
  optionOrder?: unknown;
  index?: unknown;
  answers?: unknown;
  followUps?: unknown;
};

/**
 * Repairs an optionOrder map so every diagnostic question and paired follow-up in the
 * session contains every valid option ID exactly once. Preserves existing valid ordering
 * where practical and appends any missing options in canonical order.
 */
export function repairOptionOrder(
  rawOptionOrder: unknown,
  questionIds: string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const rawObj =
    rawOptionOrder && typeof rawOptionOrder === "object" && !Array.isArray(rawOptionOrder)
      ? (rawOptionOrder as Record<string, unknown>)
      : {};

  const targetIds: string[] = [];
  for (const qid of questionIds) {
    targetIds.push(qid);
    const q = QUESTION_MAP[qid];
    if (q?.pairedQuestionId) {
      targetIds.push(q.pairedQuestionId);
    }
  }

  for (const id of targetIds) {
    const question = QUESTION_MAP[id];
    if (!question) continue;
    const validOptionIds = question.options.map((o) => o.id);
    const rawList = rawObj[id];

    if (Array.isArray(rawList)) {
      const seen = new Set<string>();
      const ordered: string[] = [];
      for (const item of rawList) {
        if (typeof item === "string" && validOptionIds.includes(item) && !seen.has(item)) {
          seen.add(item);
          ordered.push(item);
        }
      }
      for (const optId of validOptionIds) {
        if (!seen.has(optId)) {
          ordered.push(optId);
        }
      }
      result[id] = ordered;
    } else {
      result[id] = [...validOptionIds];
    }
  }

  return result;
}

/**
 * Validates and repairs session data.
 * - Recomputes correctness deterministically from option IDs and answer keys.
 * - Enforces 6 unique diagnostic questions (2 per domain).
 * - Enforces valid session ID and finite timestamps.
 * - For "history" mode: requires completedAt and all 6 diagnostic answers.
 * - For "current" mode: requires a sequentially resumable state without gaps.
 * - Repairs optionOrder where practical.
 * Returns null if the session is irrecoverably invalid.
 */
export function validSession(x: unknown, mode: "current" | "history" = "history"): Session | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const s = x as RawSession;

  // 1. Valid session ID
  if (typeof s.id !== "string" || s.id.trim().length === 0) return null;

  // 2. Finite timestamps
  if (!isValidTimestamp(s.startedAt)) return null;
  if (s.completedAt !== undefined && s.completedAt !== null) {
    if (!isValidTimestamp(s.completedAt) || s.completedAt < s.startedAt) return null;
  }
  if (mode === "history" && !isValidTimestamp(s.completedAt)) {
    return null;
  }

  // 3. Six unique diagnostic question IDs, two per domain
  if (!Array.isArray(s.questionIds) || s.questionIds.length !== 6) return null;
  const rawQids = s.questionIds as unknown[];
  const questionIds: string[] = [];
  for (const id of rawQids) {
    if (typeof id !== "string") return null;
    questionIds.push(id);
  }
  if (new Set(questionIds).size !== 6) return null;

  const domainCounts: Record<Domain, number> = {
    "cloud-concepts": 0,
    "architecture-services": 0,
    "management-governance": 0,
  };

  for (const id of questionIds) {
    const q = QUESTION_MAP[id];
    if (!q || q.kind !== "diagnostic") return null;
    domainCounts[q.domain] = (domainCounts[q.domain] ?? 0) + 1;
  }

  if (
    domainCounts["cloud-concepts"] !== 2 ||
    domainCounts["architecture-services"] !== 2 ||
    domainCounts["management-governance"] !== 2
  ) {
    return null;
  }
  // 4. An integer index within bounds
  const maxIndex = questionIds.length - 1;
  if (
    typeof s.index !== "number" ||
    !Number.isInteger(s.index) ||
    s.index < 0 ||
    s.index > maxIndex
  ) {
    return null;
  }
  if (mode === "history" && s.index !== maxIndex) return null;

  // 5. Answers validation
  if (
    s.answers !== undefined &&
    s.answers !== null &&
    (typeof s.answers !== "object" || Array.isArray(s.answers))
  ) {
    return null;
  }
  const rawAnswers = (s.answers ?? {}) as Record<string, unknown>;
  const cleanAnswers: Record<string, Attempt> = {};

  for (const [key, rawAttempt] of Object.entries(rawAnswers)) {
    if (!questionIds.includes(key)) return null;
    if (!rawAttempt || typeof rawAttempt !== "object" || Array.isArray(rawAttempt)) return null;
    const att = rawAttempt as RawAttempt;
    if (att.questionId !== key) return null;
    if (!isValidTimestamp(att.at)) return null;
    if (!isValidConfidence(att.confidence)) return null;

    const q = QUESTION_MAP[key]!;
    if (typeof att.optionId !== "string" || !q.options.some((o) => o.id === att.optionId)) {
      return null;
    }

    cleanAnswers[key] = {
      questionId: key,
      optionId: att.optionId,
      confidence: att.confidence,
      correct: att.optionId === q.correctOptionId,
      at: att.at,
    };
  }

  // 6. Follow-ups validation
  if (
    s.followUps !== undefined &&
    s.followUps !== null &&
    (typeof s.followUps !== "object" || Array.isArray(s.followUps))
  ) {
    return null;
  }
  const rawFollowUps = (s.followUps ?? {}) as Record<string, unknown>;
  const cleanFollowUps: Record<string, Attempt> = {};

  for (const [fid, rawAttempt] of Object.entries(rawFollowUps)) {
    if (!rawAttempt || typeof rawAttempt !== "object" || Array.isArray(rawAttempt)) return null;
    const att = rawAttempt as RawAttempt;
    if (att.questionId !== fid) return null;

    const f = QUESTION_MAP[fid];
    if (!f || f.kind !== "follow-up") return null;

    const parentId = questionIds.find((id) => QUESTION_MAP[id]?.pairedQuestionId === fid);
    if (!parentId || !cleanAnswers[parentId]) return null;

    if (!isValidTimestamp(att.at)) return null;
    if (!isValidConfidence(att.confidence)) return null;
    if (typeof att.optionId !== "string" || !f.options.some((o) => o.id === att.optionId)) {
      return null;
    }

    cleanFollowUps[fid] = {
      questionId: fid,
      optionId: att.optionId,
      confidence: att.confidence,
      correct: att.optionId === f.correctOptionId,
      at: att.at,
    };
  }

  // 7. Sequence check
  if (mode === "history") {
    for (const qid of questionIds) {
      if (!cleanAnswers[qid]) return null;
    }
  } else {
    for (let i = 0; i < s.index; i++) {
      const qid = questionIds[i];
      if (!qid || !cleanAnswers[qid]) return null;
    }
    for (let i = s.index + 1; i < questionIds.length; i++) {
      const qid = questionIds[i];
      if (qid && cleanAnswers[qid]) return null;
    }
  }

  // 8. Repair optionOrder
  const optionOrder = repairOptionOrder(s.optionOrder, questionIds);

  const cleanSession: Session = {
    id: s.id,
    startedAt: s.startedAt,
    questionIds,
    optionOrder,
    index: s.index,
    answers: cleanAnswers,
    followUps: cleanFollowUps,
    ...(typeof s.completedAt === "number" ? { completedAt: s.completedAt } : {}),
  };

  return cleanSession;
}

export function parseStore(raw: string | null): Store {
  if (!raw) return emptyStore();
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return emptyStore();
    return {
      version: 1,
      current: data.current ? validSession(data.current, "current") : null,
      history: Array.isArray(data.history)
        ? (data.history
            .map((h: unknown) => validSession(h, "history"))
            .filter((s: Session | null): s is Session => s !== null))
        : [],
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
