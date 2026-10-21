import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QUESTION_MAP } from "@/data/questions";
import { routeTree } from "@/routeTree.gen";
import { STORAGE_KEY, type Session, type Store } from "@/lib/quiz";

const questionIds = ["cc-scal-1", "cc-svc-1", "as-az-1", "as-auth-1", "mg-pol-1", "mg-lock-1"];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function savedSession(): Session {
  const optionOrder: Record<string, string[]> = {};
  for (const id of questionIds) {
    const question = QUESTION_MAP[id]!;
    optionOrder[id] = question.options.map((option) => option.id);
    const followUpId = question.pairedQuestionId;
    if (followUpId) {
      optionOrder[followUpId] = QUESTION_MAP[followUpId]!.options.map((option) => option.id);
    }
  }
  return {
    id: "journey-session",
    startedAt: 1000,
    questionIds: [...questionIds],
    optionOrder,
    index: 0,
    answers: {},
    followUps: {},
  };
}

function selectOption(questionId: string, confidence: string) {
  const question = QUESTION_MAP[questionId]!;
  const correctOption = question.options.find((option) => option.id === question.correctOptionId)!;
  const optionRadios = screen.getAllByRole("radio", {
    name: new RegExp(escapeRegExp(correctOption.text)),
  });
  fireEvent.click(optionRadios.at(-1)!);
  fireEvent.click(screen.getAllByRole("radio", { name: confidence }).at(-1)!);
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("learner journey", () => {
  it("resumes, answers with confidence, practices a follow-up, finishes, reviews, and views progress", async () => {
    const saved: Store = { version: 1, current: savedSession(), history: [] };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await router.load();
    render(<RouterProvider router={router} />);

    const navigation = await screen.findByRole("navigation", { name: "Main" });
    const headerContent = navigation.parentElement;
    expect(headerContent?.className).toContain("flex-col");
    expect(headerContent?.className).toContain("sm:flex-row");
    expect(screen.getByRole("link", { name: "Home" }).className).toContain("min-h-11");

    fireEvent.click(await screen.findByRole("link", { name: "Resume practice (0/6 answered)" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/practice"));
    const firstHeading = await screen.findByRole("heading", { name: "Question 1 of 6" });
    await waitFor(() => expect(document.activeElement).toBe(firstHeading));
    expect(firstHeading.className).toContain("focus-visible:outline-2");
    expect(screen.getByRole("link", { name: "Save and exit" }).className).toContain("min-h-11");

    selectOption("cc-scal-1", "Guessing");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Correct. Correct, but worth reinforcing. Your confidence: Guessing.",
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next question" }));
    fireEvent.click(screen.getByRole("button", { name: "Practice this concept" }));
    const followUpHeading = await screen.findByRole("heading", {
      name: QUESTION_MAP["cc-scal-f"]!.scenario,
    });
    await waitFor(() => expect(document.activeElement).toBe(followUpHeading));
    expect(followUpHeading.className).toContain("focus-visible:outline-2");
    selectOption("cc-scal-f", "Very sure");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getAllByRole("status").at(-1)).toHaveTextContent("Correct. Solid understanding.");
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));

    for (let index = 1; index < questionIds.length; index++) {
      await screen.findByRole("heading", { name: `Question ${index + 1} of 6` });
      selectOption(questionIds[index]!, "Very sure");
      fireEvent.click(
        screen.getByRole("button", {
          name: index === questionIds.length - 1 ? "See results" : "Next question",
        }),
      );
    }

    await waitFor(() => expect(router.state.location.pathname).toBe("/results"));
    expect(await screen.findByText("6 / 6")).toBeInTheDocument();
    const completedStore = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(completedStore.current).toBeNull();
    expect(completedStore.history).toHaveLength(1);
    expect(completedStore.history[0].followUps["cc-scal-f"].correct).toBe(true);

    fireEvent.click(screen.getByRole("link", { name: "View progress" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/progress"));
    expect(await screen.findByRole("heading", { name: "Progress" })).toBeInTheDocument();
    expect(screen.getByText("6 / 6", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Follow-up attempts (tracked separately)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Details" }).className).toContain("min-h-11");
  }, 60000);
});
