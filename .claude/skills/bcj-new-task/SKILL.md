---
name: bcj-new-task
description: Start a new task — picks its type (feat, fix, chore, docs), creates its branch and worktree from freshly-fetched origin/main, installs dependencies so the Expo app runs, and moves your session into it. Use when the user wants to start a new feature, fix, maintenance or docs task.
disable-model-invocation: true
---

# BCJ New Task

Start a task: its type, its branch, its worktree, its home for the rest of its life.

## Process

1. **Get the task name.** If the user didn't give one, ask for it in one line — a short
   human name for the work ("gym filter", "pris-sortering"). Don't interview; this skill
   starts a task, it doesn't plan one. The name becomes the `<slug>` that is the task's
   identity everywhere else: branch, worktree and parent spec issue.

2. **Pick the type.** It becomes the branch prefix. Four types:

   | Type | Means |
   | --- | --- |
   | `feat` | A feature: new functionality |
   | `fix` | A fix: something broken made right |
   | `chore` | Maintenance: deps, cleanup, config |
   | `docs` | Documentation only |

   **Pick it without asking** when the name already says it:
   - The name starts with a prefix: `fix/partner loading` → `fix`, name `partner loading`.
     Same for `feat/`, `chore/` and `docs/`.
   - The name clearly contains a type word (whole words or obvious compounds, any case):
     - `fix`, `bug`, `bugfix`, `hotfix`, `fejl`, `fejlrettelse`, `ret`, `rettelse` → `fix`
     - `docs`, `dokumentation` → `docs`
     - `deps`, `oprydning`, `vedligehold` → `chore`

   **Leave the type word out of the name** you pass on, so it never ends up in the slug:
   `bugfix gymkort` → `fix`, name `gymkort` → `fix/gymkort`.

   **Otherwise ask, with exactly this text**, and wait for the answer:

   > **Er denne task?**
   > 1. En feature
   > 2. En rettelse (fix)
   > 3. Vedligehold
   > 4. Dokumentation

   1 → `feat`, 2 → `fix`, 3 → `chore`, 4 → `docs`. Ask too when the name points at two
   different types: don't guess.

3. **Make the slug.** Lowercase, `æ→ae`, `ø→oe`, `å→aa`, every run of other non-alphanumerics
   → a single `-`, trimmed of leading/trailing `-`. `Pris sortering!` → `pris-sortering`.

4. **Refuse before creating anything** — each in plain Danish, then stop:
   - Not in the main checkout (`git rev-parse --show-toplevel` is inside `.worktrees/`) →
     tell them to go back to the main folder first. Tasks don't nest.
   - A branch `*/<slug>` already exists locally or on origin (`git branch -a --list "*/<slug>"`),
     or `.worktrees/*-<slug>` exists → the task already exists. Don't invent a variant slug
     to get past it; show what exists and let the user decide.

5. **Create it** from the repo root:

   ```bash
   git fetch origin main
   git worktree add -b <type>/<slug> .worktrees/<type>-<slug> origin/main
   git -C .worktrees/<type>-<slug> branch --unset-upstream 2>/dev/null || true
   (cd .worktrees/<type>-<slug> && npm install)
   ```

   Always cut from **freshly-fetched `origin/main`**, never the local `main`, which may be
   stale. Make sure `.worktrees/` is in `.gitignore` before creating the first one.

6. **Move the session into the new worktree**, so the task's work happens in the folder it
   will live in.

   Use the **EnterWorktree** tool with the **`path`** of the new worktree:

   ```
   EnterWorktree(path: ".worktrees/<type>-<slug>")
   ```

   - Load it first if it isn't available: `ToolSearch(query: "select:EnterWorktree")`.
   - **`path:`, never `name:`.** `name:` *creates* a brand-new worktree under
     `.claude/worktrees/` — a second, wrong home for the task, next to the real one.
   - Entering an **existing** worktree by path is deliberate: a worktree entered this way is
     never removed by `ExitWorktree` or at session end. The task's folder must outlive the
     session that made it — the planning docs, implementation and QA all still need it.
   - **If EnterWorktree is unavailable or errors, do not retry it and do not fall back to
     `cd`.** A bare `cd` moves the shell but not the session: CLAUDE.md, skills and memory
     stay loaded from the old directory, so the move half-happens in a way that is hard to
     notice. Tell the user to open it themselves instead:

     ```bash
     cd .worktrees/<type>-<slug> && claude
     ```

7. **Confirm in one line**, and stop. No next steps, no pipeline suggestions:

   > Færdig. Branch `fix/gymkort` og worktree `.worktrees/fix-gymkort` oprettet.

## Rules

- **Run from the main checkout.** Tasks don't nest.
- **One task, one name.** If the task already exists, don't invent a variant slug.
- **Never push or touch `main`.** This skill only creates a local branch and worktree.
- **Don't plan here.** This skill starts a task; it doesn't grill, spec or split it.
