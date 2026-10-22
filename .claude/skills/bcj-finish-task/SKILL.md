---
name: bcj-finish-task
description: Tear down a finished task — removes its worktree folder and local branch, but only if its PR is merged; an unmerged task gets a refusal and a folder-only offer. Use after a task's PR is merged, or to abandon one.
disable-model-invocation: true
---

# BCJ Finish Task

Clean up a task that's done — or step away from one that isn't.

## Process

1. **Show what's in flight.** For every worktree under `.worktrees/` (`git worktree list
   --porcelain`), show one row: folder, branch, PR state
   (`gh pr list --head <branch> --state all --json number,state,mergedAt,headRefOid`) and
   whether the folder has uncommitted changes (`git -C <folder> status --porcelain`). Mark
   tasks whose PR is merged as `✅ merged — klar til oprydning`.

2. **Ask which task to finish.** Default to the ones marked merged; those are the safe,
   expected case. Never assume "all the merged ones" — show the list and let them choose,
   even if there's only one.

3. **Check before removing anything.** For the chosen task, in this order — any failure is
   a refusal (see Rules):
   - The session is not standing inside the task's folder.
   - The folder has no uncommitted or untracked changes.
   - The PR is **merged**, and its `headRefOid` equals the local branch's
     `git rev-parse <branch>`. A local commit the PR never saw would otherwise be lost.

4. **Finish it:**
   - **Merged** → remove the folder and the local branch:

     ```bash
     git worktree remove .worktrees/<type>-<slug>
     git branch -D <type>/<slug>
     ```

     Nothing is lost: the work is on `main`.
   - **Not merged** → **refuse** and explain why in plain Danish, then offer folder-only
     removal. Only do it if the user explicitly says yes:

     ```bash
     git worktree remove .worktrees/<type>-<slug>
     ```

     That removes the folder and **keeps the branch and every commit**, here and on GitHub,
     so the task can be picked up again later.

5. **Relay the result.** Say what was removed and what was kept.

## Rules

- **Run from the main checkout.** You cannot remove a folder you are standing in. If the
  session is currently inside the task's folder, leave it first (`ExitWorktree` with
  `action: "keep"`, or ask the user to `cd` to the main checkout).
- **Never talk the user past a refusal.** Every refusal — unmerged, uncommitted changes in
  the folder, a local commit not in the PR — is protecting work that exists nowhere else.
  Report it and stop; never use `--force`, and don't offer one.
- Never `rm -rf` a task folder; only `git worktree remove`.
- `git branch -D` is safe **only** because step 3 confirmed with GitHub that the PR merged
  this exact commit. Don't second-guess that with `git branch --merged` — squash-merges make
  git think every properly-merged task is unmerged.
