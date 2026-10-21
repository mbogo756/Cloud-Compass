import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { QUESTION_MAP } from "@/data/questions";
import { createSession, STORAGE_KEY, type Session, type Store } from "@/lib/quiz";

const questionIds = ["cc-scal-1", "cc-svc-1", "as-az-1", "as-auth-1", "mg-pol-1", "mg-lock-1"];

function unfinishedSession(id: string): Session {
  const qid = questionIds[0]!;
  return {
    id,
    startedAt: 1000,
    questionIds: [...questionIds],
    optionOrder: {},
    index: 1,
    answers: {
      [qid]: {
        questionId: qid,
        optionId: QUESTION_MAP[qid]!.correctOptionId,
        confidence: "somewhat",
        correct: true,
        at: 1100,
      },
    },
    followUps: {},
  };
}

function completedSession(id: string, startedAt: number): Session {
  const answers = Object.fromEntries(
    questionIds.map((qid) => [
      qid,
      {
        questionId: qid,
        optionId: QUESTION_MAP[qid]!.correctOptionId,
        confidence: "very" as const,
        correct: true,
        at: startedAt + 100,
      },
    ]),
  );
  return {
    id,
    startedAt,
    completedAt: startedAt + 200,
    questionIds: [...questionIds],
    optionOrder: {},
    index: 5,
    answers,
    followUps: {},
  };
}

function persistStore(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

async function renderRoute(path: string) {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("session replacement route flows", () => {
  it("Home starts directly when there is no current session and preserves history", async () => {
    const history = [completedSession("past-home", 2000)];
    persistStore({ version: 1, current: null, history });
    const router = await renderRoute("/");

    fireEvent.click(await screen.findByRole("button", { name: "Start practice" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/practice"));
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.current.id).toBeTruthy();
    expect(saved.current.questionIds).toHaveLength(6);
    expect(saved.history.map((session: Session) => session.id)).toEqual(["past-home"]);
  });

  it("Home cancel keeps the current session in the real local store", async () => {
    const current = unfinishedSession("active-home");
    persistStore({ version: 1, current, history: [] });
    await renderRoute("/");

    fireEvent.click(await screen.findByRole("button", { name: "Start a new session" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alert", { name: "Confirm new session replacement" })).toBeNull();
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.current.id).toBe("active-home");
    expect(saved.history).toEqual([]);
  });

  it("Home discard replaces current, preserves completed history, and navigates to practice", async () => {
    const current = unfinishedSession("active-home");
    const history = [completedSession("past-home", 2000)];
    persistStore({ version: 1, current, history });
    const router = await renderRoute("/");

    fireEvent.click(await screen.findByRole("button", { name: "Start a new session" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard and start new" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/practice"));
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.current.id).not.toBe("active-home");
    expect(saved.current.questionIds).toHaveLength(6);
    expect(saved.history.map((session: Session) => session.id)).toEqual(["past-home"]);
  });

  it("Results for an older session protects and can replace the separate unfinished session", async () => {
    const older = completedSession("older-result", 2000);
    const latest = completedSession("newer-result", 3000);
    const current = unfinishedSession("active-results");
    persistStore({ version: 1, current, history: [older, latest] });
    const router = await renderRoute("/results?session=older-result");

    expect(
      await screen.findByText(`Completed ${new Date(older.completedAt!).toLocaleString()}`),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start another session" }));
    expect(
      screen.getByText(/viewing completed results, but an unfinished session is in progress/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard and start new" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/practice"));
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(saved.current.id).not.toBe("active-results");
    expect(saved.history.map((session: Session) => session.id)).toEqual([
      "older-result",
      "newer-result",
    ]);
  });
});
