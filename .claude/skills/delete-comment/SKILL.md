---
name: delete-comment
description: Audit code comments in this repository. Sorts each comment into tautology, stale, excuse or decision record, deletes all but decision records, files a Linear issue for each excuse, and keeps the bwf/no-comments lint rule passing. Use when asked to clean up, audit or delete comments, or when `vp lint` reports bwf/no-comments.
---

# Delete comments

Comments here tend to drift from the code, and a comment that explains away a shortcut lets the shortcut spread. So the lint rule `bwf/no-comments` (`scripts/lint-plugin.mjs`) bans comments, with three exceptions:

- **Decision records**: a comment whose first line starts with `Decision:`. It records an important, non-obvious decision that a careful reader couldn't work out from the code.
- **Tool directives**: `@ts-expect-error`, `oxlint-disable-next-line`, `/// <reference>`, `#__PURE__`, `@vite-ignore` and the like. The list is in `scripts/comment-rules.mjs`.
- **API docs**: JSDoc in published package source (`packages/*/src`), because people who build on bwf read it in their editor.

`scripts/comments.ts` (`vp run comments`) does the mechanical part. You do the judgment.

## Categories

| Category        | What it looks like                                                                                                                                                                                | Action                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Tautology       | Says what the code already shows: a name, a call, a branch, a test's assertion, section headers, step narration.                                                                                  | Delete.                                          |
| Stale           | Refers to code, names or behavior that no longer exist, or tells change history ("renamed from", "used to"). Grep for names it mentions.                                                          | Delete.                                          |
| Excuse          | Lets a shortcut in our code stand: TODO, FIXME, "for now", "good enough", a known race or leak left in place.                                                                                     | Delete, and file a Linear issue to fix the code. |
| Decision record | Why this approach and not the obvious one, an outside constraint (Cloudflare, D1, workerd, Postgres, GitHub, Stripe, a browser), a security or ordering need, a workaround for a third-party bug. | Keep, starting with `Decision:`.                 |

When you're not sure between a decision and a tautology, ask whether deleting it would likely lead to a bug or a wrong refactor. If not, delete it. A workaround for our own code is an excuse. A workaround for a third-party bug we can't fix here is a decision, ideally with a link to the upstream issue.

## Steps

1. Get the work list. `vp run comments count [paths]` says how many blocks and lines would go. `vp run comments list [paths] --out /tmp/comments.json` writes each block the rule reports, with an `id` (`file:offset`), its text and the code after it. Line comments on consecutive lines count as one block.
2. Decide each block. Read the code around it when the text and the following lines aren't enough. For a big list, split it by file across parallel workers and have each write its decisions to a file.
3. Write the decisions as a JSON array of `{ "id": "<id>", "action": "delete" | "decision" | "keep", "text": "<record>" }`. `text` is only for `decision`: the record without comment markers or the `Decision:` prefix, which the script adds. Use `keep` for API docs and for directives the rule's list missed (and add those to `scripts/comment-rules.mjs`).
4. Run `vp run comments apply /tmp/actions.json`. It works from the end of each file back, so the ids stay valid, and it reports an id it can't find (the file changed after `list`). Run `list` again for those.
5. File each excuse as a Linear issue in the Platform team: an imperative title, what the shortcut is, why it's a problem and what a fix looks like, with the file and line. Check for an existing issue first.
6. Run `vp fmt --write .`, then `vp lint`. Deleting the only comment in an empty block other than a `catch` leaves an empty block that `no-empty` reports. Fix the code, or keep a decision record that says why it's empty.
7. Run `vp run check` and the tests for the files you touched (see `TESTING.md`).

## Upstream sync

Void's code comes with comments. `scripts/upstream-sync.ts` runs `stripComments` on the upstream base and the upstream change before it merges, so ported code arrives without them and the three-way merge only conflicts where our code really differs. When a port brings in something that needs a decision record, add it by hand with `Decision:`.
