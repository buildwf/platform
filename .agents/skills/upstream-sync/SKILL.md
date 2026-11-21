---
name: upstream-sync
description: Bring new upstream Void commits (github.com/voidzero-dev/void) into this bwf fork. Renames them to our names with scripts/upstream-sync.ts, merges file by file, fixes conflicts, checks, and pushes. Use when asked to sync, pull or port from upstream Void.
---

# Sync from upstream Void

This repository started as a fork of Void (https://github.com/voidzero-dev/void). Upstream keeps shipping fixes and speedups. This skill brings them in one commit at a time, renamed to our names.

`scripts/upstream-sync.ts` does the mechanical part. You do the judgment: what to port, how to fix conflicts, and which names the rename table missed.

## What the fork changed

Knowing these helps you read a conflict:

- Names: `void` is `bwf` (CLI, package `@builtbyfriends/bwf`), `@void/*` is `@builtbyfriends/*`, `@voidcloud/*` is `@platform-service/*`. `VOID_PLATFORM_*` and `__VOID_*` are `PLATFORM_*` and `__PLATFORM_*`, other `VOID_*` are `BWF_*`. `x-void-*` headers are `x-platform-*`, `__void*` is `__platform*`, `void-` string prefixes are `platform-`, `void.config.ts` is `bwf.config.ts`, `.void/` is `.bwf/`.
- Removed: pages, islands, ISR, markdown and the Vue, Svelte, Solid, Nuxt, SvelteKit, Analog and Astro adapters and playgrounds. This fork is React single-page apps with an optional Workers backend.
- Layout: the runtime stays as flat files (`runtime/routing.ts`, `runtime/ws-room.ts`, `runtime/env.ts`), where upstream uses folders.
- Comments: the `bwf/no-comments` lint rule bans comments here, apart from `Decision:` records, tool directives and JSDoc in published packages. `apply` strips comments from the upstream base and the upstream change before it merges, so ported code arrives without them. See `.claude/skills/delete-comment/SKILL.md`.
- Our own additions upstream doesn't have, such as `procedures/` at `/rpc`, Realtime packages and our billing. Keep them when upstream code around them changes.

## Steps

1. Start from an up-to-date `main` with a clean tree. Run `vp install` if `node_modules` is missing.
2. Run `vp run upstream:sync status`. It fetches upstream, reads the last reviewed commit from `UPSTREAM`, and lists each new commit, oldest first, with a hint:
   - `skip`: it only touches code the fork removed.
   - `tooling`: tests or CI only. Skip test-runner and caching changes to our own setup. Port a test fix when it fixes a test we still have.
   - `review`: read the commit (`git show <sha>`) and decide.
3. Port each commit you keep, in order, one at a time:
   - `vp run upstream:sync apply <sha>`. For each file it runs a three-way merge between our file and the upstream before and after, both renamed. It prints what applied cleanly, which files have conflicts, and what needs a hand port.
   - Fix conflict markers (`ours`, `upstream base`, `upstream`). Keep our additions and our names. Drop upstream parts that serve removed features.
   - Search the changed files for names the table missed: `git diff | grep -i void`. The TypeScript `void` keyword is fine. If a rename comes up more than once, add it to the table in `scripts/upstream-sync.ts`, and check it with `vp run upstream:sync rename "<text>"`.
   - If an upstream comment explained something a reader of the ported code needs (an outside constraint, an ordering or security reason), add it back by hand as a `Decision:` record. Leave out the rest.
   - If the commit changed dependencies, run `vp install` to update the lockfile. The script leaves the lockfile out.
   - Run the tests for the files you touched (`vp test run <file>`), then `vp run --filter ./packages/bwf typecheck` (or `vp run check` for wider changes), `vp lint` and `vp fmt --check`.
   - Commit as `Port upstream <short sha>: <upstream subject>`, with the upstream link `https://github.com/voidzero-dev/void/commit/<sha>` in the body.
4. When a commit is too large or risky to port in one go, stop there. Don't move `UPSTREAM` past it, and say what it needs.
5. Run `vp run upstream:sync mark <sha>` with the last commit you've dealt with, ported or skipped. Commit `UPSTREAM` as `Mark upstream reviewed through <short sha>`, and list the skipped commits with a reason each in the body.
6. Run `vp run test` for the changed files. Push to `main`. If the session can only push a branch, open a pull request and merge it once its checks pass.
7. Report what you ported, what you skipped and why, and anything left for a person.

## Things that tend to go wrong

- A file upstream changed may be one this fork removed on purpose. The script lists it under "needs a hand port"; in most cases that means skip it.
- Upstream's version numbers and `MIN_PLATFORM_VERSION` don't line up with ours. Leave ours.
- Release, changelog and docs-only commits are mostly not worth porting. Docs here describe bwf, not Void.
- Integration tests need Node 24.22 or later and a built `packages/bwf/dist`. Run them from the repository root.
- Keep app names out of this repository: `packages/bwf/test/unit/product-names.test.ts` checks it.
