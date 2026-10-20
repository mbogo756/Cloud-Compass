// @ts-nocheck -- test file; index access is asserted at runtime
import { describe, expect, it } from "vitest";
import { QUESTIONS, QUESTION_MAP } from "@/data/questions";
import { computeStats, createSession, parseStore, submitDiagnostic, submitFollowUp } from "@/lib/quiz";
import { getCoaching } from "@/lib/coaching";

const wrongOf = (id: string) => QUESTION_MAP[id].options.find((o) => o.id !== QUESTION_MAP[id].correctOptionId)!.id;

describe("question bank", () => {
  it("has 12 diagnostic and 6 follow-ups, 4 diagnostic per domain", () => {
    expect(QUESTIONS.filter((q) => q.kind === "diagnostic")).toHaveLength(12);
    expect(QUESTIONS.filter((q) => q.kind === "follow-up")).toHaveLength(6);
    for (const d of ["cloud-concepts", "architecture-services", "management-governance"])
      expect(QUESTIONS.filter((q) => q.kind === "diagnostic" && q.domain === d)).toHaveLength(4);
  });
});

describe("session", () => {
  it("draws two unique diagnostic questions per domain", () => {
    for (let i = 0; i < 20; i++) {
      const s = createSession();
      expect(new Set(s.questionIds).size).toBe(6);
      const counts: Record<string, number> = {};
      s.questionIds.forEach((id) => (counts[QUESTION_MAP[id].domain] = (counts[QUESTION_MAP[id].domain] ?? 0) + 1));
      expect(Object.values(counts)).toEqual([2, 2, 2]);
    }
  });

  it("locks the first diagnostic attempt", () => {
    let s = createSession();
    const id = s.questionIds[0];
    s = submitDiagnostic(s, id, wrongOf(id), "very");
    s = submitDiagnostic(s, id, QUESTION_MAP[id].correctOptionId, "very");
    expect(s.answers[id].correct).toBe(false);
    expect(computeStats(s).diagnostic).toEqual({ correct: 0, total: 1 });
  });

  it("follow-up success does not change the diagnostic score", () => {
    let s = createSession();
    const id = s.questionIds.find((x) => QUESTION_MAP[x].pairedQuestionId)!;
    const fid = QUESTION_MAP[id].pairedQuestionId!;
    s = submitFollowUp(s, fid, QUESTION_MAP[fid].correctOptionId, "very"); // before diagnostic: ignored
    expect(s.followUps[fid]).toBeUndefined();
    s = submitDiagnostic(s, id, wrongOf(id), "guessing");
    s = submitFollowUp(s, fid, QUESTION_MAP[fid].correctOptionId, "very");
    const st = computeStats(s);
    expect(st.diagnostic).toEqual({ correct: 0, total: 1 });
    expect(st.followUp).toEqual({ correct: 1, total: 1 });
  });
});

describe("coaching", () => {
  const q = QUESTIONS[0];
  const a = (correct: boolean, confidence: "guessing" | "somewhat" | "very") => ({ questionId: q.id, optionId: "x", correct, confidence, at: 0 });
  it.each([
    [true, "very", "reinforce"],
    [true, "somewhat", "explain-reasoning"],
    [true, "guessing", "reinforcement-practice"],
    [false, "very", "possible-misconception"],
    [false, "somewhat", "foundational"],
    [false, "guessing", "foundational"],
  ] as const)("correct=%s confidence=%s → %s", (c, conf, cat) => {
    expect(getCoaching(q, a(c, conf)).category).toBe(cat);
  });
});

describe("storage", () => {
  it("handles malformed data", () => {
    expect(parseStore("not json")).toEqual({ version: 1, current: null, history: [] });
    expect(parseStore(JSON.stringify({ version: 1, current: { id: 1 }, history: "x" }))).toEqual({ version: 1, current: null, history: [] });
  });
});
