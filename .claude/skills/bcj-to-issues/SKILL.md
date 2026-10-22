---
name: bcj-to-issues
description: Break a spec into independently-grabbable sub-issue tasks on the project issue tracker using tracer-bullet vertical slices, attached to the task's parent spec issue.
disable-model-invocation: true
---

# BCJ To Issues

Break a spec into independently-grabbable **sub-issue tasks** using vertical slices (tracer bullets), attached under the task's **parent spec issue** (created by `/bcj-to-spec`).

**Read `docs/workflow/issue-tracker.md` first** — it is the issue tracker and triage label vocabulary for this repo (which tracker, which repo, which CLI, which labels). Do **not** run `/setup-matt-pocock-skills`.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. The input is the task's **spec** and its **parent spec issue** — created by `/bcj-to-spec` just before this skill runs. You need the parent spec issue's **number** to attach sub-issues under it: take it from the conversation, or accept it as an argument (issue number or URL) and fetch its full body and comments.

If no parent spec issue exists yet, stop and tell the user to run `/bcj-to-spec` first — this skill only creates the sub-issue tasks, never the parent.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Issue titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

<vertical-slice-rules>

- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Any prefactoring should be done first

</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories this addresses (if the source material has them)

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?

Iterate until the user approves the breakdown.

### 5. Publish the sub-issue tasks and attach them to the parent spec

For each approved slice, publish a new issue and attach it as a **sub-issue** of the parent spec issue. Each sub-issue is a task an implementer subagent in `/bcj-implement-spec` can grab.

Do all of this **in dependency/build order** (blockers first) — you need real issue identifiers for the "Blocked by" field, and `/bcj-implement-spec` reads the sub-issues in **checklist (position) order**, which is the order you attach them. For each slice:

1. **Create the issue** with the body template below, assigned to the driver, carrying the `ready-for-agent` triage label (unless the user says otherwise):

   ```bash
   gh issue create --title "<title>" --body-file <body> \
     --assignee "<driver>" --label ready-for-agent
   ```

   The driver defaults to the current user (`gh api user --jq .login`) — the same person the parent spec is assigned to.

2. **Attach it as a sub-issue of the parent.** The sub-issues REST endpoint takes the child's **REST database id** — NOT the issue number and NOT the GraphQL node id:

   ```bash
   REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
   CHILD_ID="$(gh api "repos/$REPO/issues/<child#>" --jq .id)"
   gh api --method POST "repos/$REPO/issues/<parent#>/sub_issues" \
     -F sub_issue_id="$CHILD_ID"
   ```

The parent spec issue itself is **never** given `ready-for-agent` (that stays on the sub-issues only) and its body is **never** modified — you only attach children to it. GitHub then renders the sub-issue checklist and `X of Y` progress on the parent automatically.

<issue-template>
## Parent

A reference to the parent spec issue this task belongs to (e.g. `#<parent#>`).

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it here and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking ticket (if any)

Or "None - can start immediately" if no blockers.

</issue-template>

Do NOT close or modify the parent spec issue — only attach sub-issues to it.
