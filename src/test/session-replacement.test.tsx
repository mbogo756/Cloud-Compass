import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { SessionReplacePrompt } from "@/components/SessionReplacePrompt";
import type { Session } from "@/lib/quiz";
import { QUESTION_MAP } from "@/data/questions";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const validQids = ["cc-scal-1", "cc-svc-1", "as-az-1", "as-auth-1", "mg-pol-1", "mg-lock-1"];

function createTestSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-session-current",
    startedAt: 1000,
    questionIds: [...validQids],
    optionOrder: {},
    index: 2,
    answers: {
      [validQids[0]!]: {
        questionId: validQids[0]!,
        optionId: QUESTION_MAP[validQids[0]!]!.options[0]!.id,
        confidence: "very",
        correct: true,
        at: 1010,
      },
      [validQids[1]!]: {
        questionId: validQids[1]!,
        optionId: QUESTION_MAP[validQids[1]!]!.options[0]!.id,
        confidence: "somewhat",
        correct: false,
        at: 1020,
      },
    },
    followUps: {},
    ...overrides,
  };
}

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

function renderComponent(ui: React.ReactElement) {
  return render(ui);
}

describe("Session replacement protection", () => {
  it("renders compact inline prompt with answered counts and three required actions", () => {
    const unfinished = createTestSession();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();

    renderComponent(
      <SessionReplacePrompt
        unfinishedSession={unfinished}
        onDiscardAndStart={onDiscard}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Replace unfinished session?")).toBeInTheDocument();
    expect(screen.getByText(/2 of 6 answered/)).toBeInTheDocument();

    const discardBtn = screen.getByRole("button", { name: /Discard and start new/i });
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    const resumeLink = screen.getByRole("link", { name: /Resume practice/i });

    expect(discardBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();
    expect(resumeLink).toBeInTheDocument();
    expect(resumeLink).toHaveAttribute("href", "/practice");
  });

  it("handles cancellation without modifying the session", () => {
    const unfinished = createTestSession();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();

    renderComponent(
      <SessionReplacePrompt
        unfinishedSession={unfinished}
        onDiscardAndStart={onDiscard}
        onCancel={onCancel}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("calls the discard callback when discard-and-start is clicked", () => {
    const unfinished = createTestSession();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();

    renderComponent(
      <SessionReplacePrompt
        unfinishedSession={unfinished}
        onDiscardAndStart={onDiscard}
        onCancel={onCancel}
      />,
    );

    const discardBtn = screen.getByRole("button", { name: /Discard and start new/i });
    fireEvent.click(discardBtn);

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("supports custom description when protecting an unfinished session from an older results view", () => {
    const unfinished = createTestSession();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();

    const resultsDesc = `You are viewing completed results, but an unfinished session is in progress (2 of 6 answered). Starting another session will discard it. Completed history remains saved.`;

    renderComponent(
      <SessionReplacePrompt
        unfinishedSession={unfinished}
        onDiscardAndStart={onDiscard}
        onCancel={onCancel}
        title="Replace unfinished session?"
        description={resultsDesc}
      />,
    );

    expect(screen.getByText("Replace unfinished session?")).toBeInTheDocument();
    expect(screen.getByText(/You are viewing completed results/)).toBeInTheDocument();
  });
});
