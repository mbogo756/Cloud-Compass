<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Question content lives in src/data/questions.ts; scoring/storage in src/lib/quiz.ts; coaching in src/lib/coaching.ts — keep content, scoring, and UI separate so content can be reviewed independently.
- Coaching goes through getCoaching() only, so a future server-side AI coach can replace it without touching quiz UI. Scores are always deterministic from the answer key.
- Practice data is browser-local (localStorage, versioned key); no accounts or database in this phase.
