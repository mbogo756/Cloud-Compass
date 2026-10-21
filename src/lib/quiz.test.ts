// @ts-nocheck -- test file; index access is asserted at runtime
import { describe, expect, it } from "vitest";
import { QUESTIONS, QUESTION_MAP } from "@/data/questions";
import { computeStats, createSession, parseStore, submitDiagnostic, submitFollowUp, validSession } from "@/lib/quiz";
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
  const validQids = ["cc-scal-1", "cc-svc-1", "as-az-1", "as-auth-1", "mg-pol-1", "mg-lock-1"];

  const makeValidSession = (overrides = {}) => ({
    id: "session-1",
    startedAt: 1000,
    questionIds: [...validQids],
    index: 0,
    answers: {},
    followUps: {},
    optionOrder: {},
    ...overrides,
  });

  const makeCompletedSession = (overrides = {}) => {
    const s = makeValidSession({
      id: "completed-1",
      completedAt: 2000,
      index: 5,
    });
    for (const qid of validQids) {
      s.answers[qid] = {
        questionId: qid,
        optionId: QUESTION_MAP[qid].correctOptionId,
        confidence: "very",
        correct: true,
        at: 1500,
      };
    }
    return { ...s, ...overrides };
  };

  it("handles malformed data", () => {
    expect(parseStore("not json")).toEqual({ version: 1, current: null, history: [] });
    expect(parseStore(JSON.stringify({ version: 1, current: { id: 1 }, history: "x" }))).toEqual({
      version: 1,
      current: null,
      history: [],
    });
    expect(parseStore(JSON.stringify({ version: 2, current: null, history: [] }))).toEqual({
      version: 1,
      current: null,
      history: [],
    });
  });

  it("performs valid persistence round trips", () => {
    const current = makeValidSession({
      index: 1,
      answers: {
        [validQids[0]]: {
          questionId: validQids[0],
          optionId: QUESTION_MAP[validQids[0]].correctOptionId,
          confidence: "somewhat",
          correct: true,
          at: 1100,
        },
      },
    });
    const history = [makeCompletedSession()];
    const store = { version: 1, current, history };

    const parsed = parseStore(JSON.stringify(store));
    expect(parsed.version).toBe(1);
    expect(parsed.current?.id).toBe("session-1");
    expect(parsed.current?.answers[validQids[0]]?.optionId).toBe(QUESTION_MAP[validQids[0]].correctOptionId);
    expect(parsed.history).toHaveLength(1);
    expect(parsed.history[0]?.id).toBe("completed-1");
  });

  it("rejects duplicate question IDs and enforces two per domain", () => {
    // Duplicate question ID
    const duplicateQids = ["cc-scal-1", "cc-scal-1", "as-az-1", "as-auth-1", "mg-pol-1", "mg-lock-1"];
    expect(validSession(makeValidSession({ questionIds: duplicateQids }), "current")).toBeNull();

    // 3 from cloud-concepts, 1 from architecture-services
    const skewedDomains = ["cc-scal-1", "cc-svc-1", "cc-opex-1", "as-az-1", "mg-pol-1", "mg-lock-1"];
    expect(validSession(makeValidSession({ questionIds: skewedDomains }), "current")).toBeNull();

    // Less than 6 questions
    expect(validSession(makeValidSession({ questionIds: validQids.slice(0, 5) }), "current")).toBeNull();
  });

  it("rejects invalid indices", () => {
    expect(validSession(makeValidSession({ index: -1 }), "current")).toBeNull();
    expect(validSession(makeValidSession({ index: 6 }), "current")).toBeNull();
    expect(validSession(makeValidSession({ index: 1.5 }), "current")).toBeNull();
    expect(validSession(makeValidSession({ index: "0" }), "current")).toBeNull();
  });

  it("rejects invalid session IDs and non-finite timestamps", () => {
    expect(validSession(makeValidSession({ id: "" }), "current")).toBeNull();
    expect(validSession(makeValidSession({ id: "   " }), "current")).toBeNull();
    expect(validSession(makeValidSession({ startedAt: -1 }), "current")).toBeNull();
    expect(validSession(makeValidSession({ startedAt: Infinity }), "current")).toBeNull();
    expect(validSession(makeValidSession({ startedAt: NaN }), "current")).toBeNull();
    expect(validSession(makeValidSession({ completedAt: 500, startedAt: 1000 }), "current")).toBeNull();
  });

  it("rejects invalid answer options and mismatched question IDs", () => {
    // Non-existent option ID
    const badOption = makeValidSession({
      index: 1,
      answers: {
        [validQids[0]]: {
          questionId: validQids[0],
          optionId: "not-an-option",
          confidence: "very",
          correct: false,
          at: 1100,
        },
      },
    });
    expect(validSession(badOption, "current")).toBeNull();

    // Mismatched questionId in attempt vs map key
    const mismatchedKey = makeValidSession({
      index: 1,
      answers: {
        [validQids[0]]: {
          questionId: validQids[1],
          optionId: QUESTION_MAP[validQids[1]].options[0].id,
          confidence: "very",
          correct: false,
          at: 1100,
        },
      },
    });
    expect(validSession(mismatchedKey, "current")).toBeNull();

    // Answer for question not belonging to the session
    const alienAnswer = makeValidSession({
      index: 0,
      answers: {
        "cc-opex-1": {
          questionId: "cc-opex-1",
          optionId: QUESTION_MAP["cc-opex-1"].options[0].id,
          confidence: "very",
          correct: false,
          at: 1100,
        },
      },
    });
    expect(validSession(alienAnswer, "current")).toBeNull();

    // Unrecognized confidence
    const badConfidence = makeValidSession({
      index: 1,
      answers: {
        [validQids[0]]: {
          questionId: validQids[0],
          optionId: QUESTION_MAP[validQids[0]].correctOptionId,
          confidence: "certainly",
          correct: true,
          at: 1100,
        },
      },
    });
    expect(validSession(badConfidence, "current")).toBeNull();
  });

  it("validates follow-up relationships", () => {
    // Follow-up without answered parent is rejected
    const unparented = makeValidSession({
      followUps: {
        "cc-scal-f": {
          questionId: "cc-scal-f",
          optionId: QUESTION_MAP["cc-scal-f"].options[0].id,
          confidence: "very",
          correct: false,
          at: 1100,
        },
      },
    });
    expect(validSession(unparented, "current")).toBeNull();

    // Follow-up whose parent is answered is accepted
    const parented = makeValidSession({
      index: 1,
      answers: {
        "cc-scal-1": {
          questionId: "cc-scal-1",
          optionId: QUESTION_MAP["cc-scal-1"].options[0].id,
          confidence: "guessing",
          correct: false,
          at: 1050,
        },
      },
      followUps: {
        "cc-scal-f": {
          questionId: "cc-scal-f",
          optionId: QUESTION_MAP["cc-scal-f"].correctOptionId,
          confidence: "very",
          correct: true,
          at: 1100,
        },
      },
    });
    const cleaned = validSession(parented, "current");
    expect(cleaned).not.toBeNull();
    expect(cleaned?.followUps["cc-scal-f"]?.correct).toBe(true);

    // Follow-up with invalid optionId is rejected
    const badFollowOption = makeValidSession({
      index: 1,
      answers: {
        "cc-scal-1": {
          questionId: "cc-scal-1",
          optionId: QUESTION_MAP["cc-scal-1"].options[0].id,
          confidence: "guessing",
          correct: false,
          at: 1050,
        },
      },
      followUps: {
        "cc-scal-f": {
          questionId: "cc-scal-f",
          optionId: "invalid-opt",
          confidence: "very",
          correct: true,
          at: 1100,
        },
      },
    });
    expect(validSession(badFollowOption, "current")).toBeNull();
  });

  it("recomputes correctness from stored option IDs and does not trust saved booleans", () => {
    const qid = validQids[0];
    const correctOpt = QUESTION_MAP[qid].correctOptionId;
    const wrongOpt = wrongOf(qid);

    // Stored as correct: false, but option was actually correct
    const falseNegative = makeValidSession({
      index: 1,
      answers: {
        [qid]: {
          questionId: qid,
          optionId: correctOpt,
          confidence: "very",
          correct: false, // falsified saved boolean
          at: 1100,
        },
      },
    });
    const cleanFN = validSession(falseNegative, "current");
    expect(cleanFN?.answers[qid]?.correct).toBe(true);

    // Stored as correct: true, but option was actually wrong
    const falsePositive = makeValidSession({
      index: 1,
      answers: {
        [qid]: {
          questionId: qid,
          optionId: wrongOpt,
          confidence: "very",
          correct: true, // falsified saved boolean
          at: 1100,
        },
      },
    });
    const cleanFP = validSession(falsePositive, "current");
    expect(cleanFP?.answers[qid]?.correct).toBe(false);
  });

  it("repairs option ordering to guarantee every valid option is present exactly once", () => {
    const qid = "cc-scal-1";
    const expectedOpts = QUESTION_MAP[qid].options.map((o) => o.id);

    // 1. Missing options in optionOrder: keep existing order, append missing
    const partialOrder = { [qid]: [expectedOpts[2], expectedOpts[0]] };
    const sessionWithPartial = makeValidSession({ optionOrder: partialOrder });
    const cleanPartial = validSession(sessionWithPartial, "current");
    expect(cleanPartial?.optionOrder[qid]).toHaveLength(expectedOpts.length);
    expect(new Set(cleanPartial?.optionOrder[qid])).toEqual(new Set(expectedOpts));
    expect(cleanPartial?.optionOrder[qid]?.slice(0, 2)).toEqual([expectedOpts[2], expectedOpts[0]]);

    // 2. Duplicates and unknown options in optionOrder: deduplicate, drop unknown, append missing
    const messyOrder = { [qid]: [expectedOpts[1], "fake-opt", expectedOpts[1], expectedOpts[3]] };
    const sessionWithMessy = makeValidSession({ optionOrder: messyOrder });
    const cleanMessy = validSession(sessionWithMessy, "current");
    expect(cleanMessy?.optionOrder[qid]).toHaveLength(expectedOpts.length);
    expect(new Set(cleanMessy?.optionOrder[qid])).toEqual(new Set(expectedOpts));
    expect(cleanMessy?.optionOrder[qid]?.indexOf("fake-opt")).toBe(-1);

    // 3. Missing optionOrder entirely: generates canonical options
    const emptyOrderSession = makeValidSession({ optionOrder: undefined });
    const cleanEmpty = validSession(emptyOrderSession, "current");
    expect(cleanEmpty?.optionOrder[qid]).toEqual(expectedOpts);
  });

  it("requires completed history to contain all diagnostic answers and finite completedAt", () => {
    const missingOne = makeCompletedSession();
    delete missingOne.answers[validQids[validQids.length - 1]];
    expect(validSession(missingOne, "history")).toBeNull();

    const missingCompletedAt = makeCompletedSession({ completedAt: undefined });
    expect(validSession(missingCompletedAt, "history")).toBeNull();

    expect(validSession(makeCompletedSession({ index: 4 }), "history")).toBeNull();
    expect(validSession(makeCompletedSession({ index: 6 }), "history")).toBeNull();
    expect(validSession(makeCompletedSession({ index: 5 }), "history")).not.toBeNull();
  });

  it("enforces sequentially resumable sequence for current sessions", () => {
    // Gap in sequence: index 2, question 0 answered, question 1 missing, question 2 answered
    const gapSession = makeValidSession({
      index: 2,
      answers: {
        [validQids[0]]: {
          questionId: validQids[0],
          optionId: QUESTION_MAP[validQids[0]].options[0].id,
          confidence: "very",
          correct: true,
          at: 1000,
        },
        [validQids[2]]: {
          questionId: validQids[2],
          optionId: QUESTION_MAP[validQids[2]].options[0].id,
          confidence: "very",
          correct: true,
          at: 1000,
        },
      },
    });
    expect(validSession(gapSession, "current")).toBeNull();

    // Answer exists ahead of index
    const aheadSession = makeValidSession({
      index: 0,
      answers: {
        [validQids[1]]: {
          questionId: validQids[1],
          optionId: QUESTION_MAP[validQids[1]].options[0].id,
          confidence: "very",
          correct: true,
          at: 1000,
        },
      },
    });
    expect(validSession(aheadSession, "current")).toBeNull();

    // Safely resumable: index 1, question 0 answered, question 1 not answered yet
    const resumableBeforeAnswer = makeValidSession({
      index: 1,
      answers: {
        [validQids[0]]: {
          questionId: validQids[0],
          optionId: QUESTION_MAP[validQids[0]].options[0].id,
          confidence: "very",
          correct: true,
          at: 1000,
        },
      },
    });
    expect(validSession(resumableBeforeAnswer, "current")).not.toBeNull();

    // Safely resumable: index 1, questions 0 and 1 answered
    const resumableAfterAnswer = makeValidSession({
      index: 1,
      answers: {
        [validQids[0]]: {
          questionId: validQids[0],
          optionId: QUESTION_MAP[validQids[0]].options[0].id,
          confidence: "very",
          correct: true,
          at: 1000,
        },
        [validQids[1]]: {
          questionId: validQids[1],
          optionId: QUESTION_MAP[validQids[1]].options[0].id,
          confidence: "very",
          correct: true,
          at: 1050,
        },
      },
    });
    expect(validSession(resumableAfterAnswer, "current")).not.toBeNull();
  });

  it("isolates invalid history from valid history and invalid current from valid history", () => {
    const validPast = makeCompletedSession({ id: "valid-past" });
    const corruptedPast = makeCompletedSession({ id: "bad-past", questionIds: ["cc-scal-1"] }); // only 1 question
    const corruptedCurrent = makeValidSession({ id: "bad-current", index: 10 }); // out of bounds index

    const storeData = {
      version: 1,
      current: corruptedCurrent,
      history: [validPast, corruptedPast],
    };

    const parsed = parseStore(JSON.stringify(storeData));
    expect(parsed.current).toBeNull(); // corrupted current discarded
    expect(parsed.history).toHaveLength(1); // corrupted history discarded, valid history retained
    expect(parsed.history[0]?.id).toBe("valid-past");
  });
});
