# Cloud Compass

**Unofficial AZ-900 Practice Coach** — not affiliated with or endorsed by Microsoft.

A confidence-aware diagnostic tool for AZ-900 exam preparation.
Answer a question, report how confident you were, and get targeted feedback.
If you guessed correctly, or were very sure but wrong, the coach flags the gap and offers a focused follow-up on the same concept.

> **Prototype status.** Question content is authored and pending human review.
> Coaching is deterministic (rule-based). Live AI coaching is planned but not yet implemented.
> No accounts, no server, no database — everything is browser-local.

---

## Features

- **Six-question diagnostic sessions** — two questions per AZ-900 domain (cloud concepts, Azure architecture and services, Azure management and governance).
- **Self-reported confidence** — Guessing / Somewhat sure / Very sure before each submission.
- **Targeted feedback** — coaching adapts to correctness + confidence (e.g. flags possible misconceptions when you're wrong while very sure).
- **Optional paired follow-up questions** — a different question on the same concept; not counted in diagnostic score.
- **Separate scoring** — diagnostic first attempts and follow-up attempts tracked independently.
- **Shuffled answer choices** — option order is randomised per session and stored so resuming works correctly.
- **Locked submitted answers** — first attempt is final; resubmissions are ignored.
- **Session resume** — unfinished sessions survive page refresh and explicit navigation away.
- **Unfinished session protection** — starting a new session when one is in progress requires an explicit decision (Resume / Discard and start / Cancel).
- **Results and review page** — score by domain, confidence patterns, concepts to revisit, and full answer review.
- **Progress page** — aggregated stats across all completed sessions.
- **Browser-local persistence** — `localStorage` under the versioned key `cloud-compass:v1`.
- **Draft-content notice** — footer and coaching make the unofficial / prototype status clear.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing) |
| Build tool | [Vite](https://vite.dev/) 8 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + custom design tokens |
| UI components | Radix UI primitives + shadcn/ui |
| Icons | Lucide React |
| Package manager | [Bun](https://bun.sh/) (lockfile: `bun.lock`) |
| Tests | [Vitest](https://vitest.dev/) 4 + Testing Library |

---

## Setup

Install [Bun](https://bun.sh/) if it is not already on your machine:

```sh
curl -fsSL https://bun.sh/install | bash
```

Then clone and install:

```sh
git clone https://github.com/mbogo756/Cloud-Compass
cd Cloud-Compass
bun install --frozen-lockfile
```

> **Lockfile note.** The repository uses `bun.lock`. Do not add `package-lock.json` or `yarn.lock`. Run `bun install --frozen-lockfile` to reproduce the exact dependency tree.

---

## Development

```sh
bun run dev       # Vite dev server at http://localhost:5173
```

---

## Tests

Tests run through Vitest with a jsdom environment. Use `bun run test`, not direct `bun test`, because the project's Vitest setup (`vitest.config.ts`) configures jsdom and `@testing-library/jest-dom` matchers.

```sh
bun run test          # Run all tests once (vitest run)
bun run test:watch    # Watch mode
```

There are four test files:

| File | What it covers |
|---|---|
| `src/lib/quiz.test.ts` | Question bank shape, session creation, answer locking, follow-up gating, coaching categories, storage validation, recomputed correctness, option-order repair, history isolation |
| `src/test/session-replacement.test.tsx` | `SessionReplacePrompt` component rendering and callback behavior |
| `src/test/session-replacement-routes.test.tsx` | Home and Results route flows with the real router, local store, localStorage, cancellation, discard, history preservation, and older-result selection |
| `src/test/app-routing.test.tsx` | Route matching — verifies `/` resolves to a route, not a 404 |

These tests use jsdom. The session replacement route tests exercise real client-side navigation and localStorage through a memory router; they are not browser end-to-end tests.

---

## TypeScript check

```sh
bun x tsc --noEmit
```

---

## Lint

The project uses ESLint + Prettier. Most prettier violations are style-only and pre-date this milestone.

```sh
bun run lint            # report violations
bun run format          # auto-fix formatting
```

---

## Production build

```sh
bun run build      # Vite + Nitro build → .output/
bun run preview    # Preview the production build locally
```

---

## Device-local storage

All practice data lives in `localStorage` under the key `cloud-compass:v1`.

- **No account or server is involved.** Data is tied to the browser profile on the current device.
- **Clearing browser data deletes all progress.**
- The store is validated on load. Irrecoverably corrupt sessions are discarded; valid history is preserved.
- Saved `correct` booleans are not trusted — correctness is recomputed from stored option IDs against the answer key on every load.

---

## Question content

The question bank (`src/data/questions.ts`) is original prototype content authored for this hackathon.
Its questions, explanations, and source links have completed project content review; they have **not been reviewed or approved by Microsoft** or any certification authority.
All questions carry `reviewStatus: "reviewed"`.

Content is kept strictly separate from scoring logic (`src/lib/quiz.ts`) and UI so it can be reviewed and corrected independently.

---

## Coaching

Coaching today is **fully deterministic** — the `getCoaching()` function in `src/lib/coaching.ts` maps (correctness, confidence) pairs to authored feedback messages. No AI or network call is made.

The function is isolated behind a single entry point so a future server-side AI coach can replace or augment it without touching the quiz UI.

---

## Planned (not yet implemented)

- Live AI coaching (server-side, replacing/augmenting `getCoaching()`)
- Learner accounts and a shared database

---

## Unofficial status

Cloud Compass is an independent study aid. It is **not** an official Microsoft product, not affiliated with Microsoft, and should not be treated as authoritative exam preparation material.
