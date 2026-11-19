---
description: "Set up coding agents with bwf init, including project instructions and links to bwf's docs and skills."
outline: deep
---

# Using bwf with Coding Agents

`bwf init` sets up coding agents as part of project initialization:

```sh
npx bwf init
```

New projects get a minimal `AGENTS.md` explaining bwf and where to read its docs.
In an existing project, bwf asks before creating, appending to, or updating
`AGENTS.md`. It preserves your instructions outside the bwf section. Declining
keeps the file unchanged; CI and non-interactive runs skip changes to existing
projects' instructions.

The complete Markdown docs ship at `node_modules/@builtbyfriends/bwf/docs/`. Start with
`guide/quickstart.md` for setup and `reference/cli.md` for commands. Agents can
read them directly, even without a linked skill.

## Skills

Skills point your agent to the commands and docs it needs for the task. They link to the installed `bwf` package, so the guidance matches the version your app uses.

bwf ships two skills:

- **`bwf`:** commands and docs for app development.
- **`migrate-vite-cloudflare-to-platform`:** migration skill for converting existing `@cloudflare/vite-plugin` apps to bwf.

Skills are linked automatically by `bwf init` when it detects a supported
agent's configuration. For example, Claude Code uses `.claude/skills/` and Codex
uses `.agents/skills/`. The skills use the app's installed docs so their guidance
matches its bwf version. Globally installed skills can use the docs in their
bwf package when there is no local installation. If no agent is detected, the
instructions still point directly to the bundled docs.
