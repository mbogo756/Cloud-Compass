import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionCard } from "@/components/QuestionCard";
import { QUESTION_MAP } from "@/data/questions";
import { useState } from "react";
import type { Attempt, Confidence } from "@/lib/quiz";

function InteractiveQuestion({
  onSubmit,
}: {
  onSubmit: (optionId: string, confidence: Confidence) => void;
}) {
  const question = QUESTION_MAP["cc-scal-1"]!;
  const [attempt, setAttempt] = useState<Attempt>();
  return (
    <QuestionCard
      question={question}
      order={question.options.map((option) => option.id)}
      attempt={attempt}
      onSubmit={(optionId, confidence) => {
        onSubmit(optionId, confidence);
        setAttempt({
          questionId: question.id,
          optionId,
          confidence,
          correct: optionId === question.correctOptionId,
          at: Date.now(),
        });
      }}
      label="Diagnostic"
    />
  );
}

describe("QuestionCard accessibility", () => {
  it("provides labeled radios and announces submitted feedback in a persistent status region", () => {
    const onSubmit = vi.fn();

    render(<InteractiveQuestion onSubmit={onSubmit} />);

    const answer = screen.getByRole("radio", { name: /High availability/ });
    const confidence = screen.getByRole("radio", { name: "Guessing" });
    expect(answer.closest("label")?.className).toContain("has-[:focus-visible]:ring-2");
    expect(confidence.closest("label")?.className).toContain("has-[:focus-visible]:ring-2");
    expect(screen.getByRole("status")).toHaveTextContent("");

    fireEvent.click(screen.getByRole("radio", { name: /Scalability/ }));
    fireEvent.click(confidence);
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(onSubmit).toHaveBeenCalledWith("b", "guessing");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Correct. Correct, but worth reinforcing. Your confidence: Guessing.",
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByRole("link", { name: /Microsoft Learn:/ }).className).toContain("min-h-11");
  }, 15000);
});
