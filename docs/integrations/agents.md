---
description: "Set up coding agents with nosam init, including project instructions and links to Nosam's docs and skills."
outline: deep
---

# Using Nosam with Coding Agents

`nosam init` sets up coding agents as part of project initialization:

```sh
npx nosam init
```

New projects get a minimal `AGENTS.md` explaining Nosam and where to read its docs.
In an existing project, Nosam asks before creating, appending to, or updating
`AGENTS.md`. It preserves your instructions outside the Nosam section. Declining
keeps the file unchanged; CI and non-interactive runs skip changes to existing
projects' instructions.

The complete Markdown docs ship at `node_modules/nosam/docs/`. Start with
`guide/quickstart.md` for setup and `reference/cli.md` for commands. Agents can
read them directly, even without a linked skill.

## Skills

Skills point your agent to the commands and docs it needs for the task. They link to the installed `nosam` package, so the guidance matches the version your app uses.

Nosam ships two skills:

- **`nosam`:** commands and docs for app development.
- **`migrate-vite-cloudflare-to-nosam`:** migration skill for converting existing `@cloudflare/vite-plugin` apps to Nosam.

Skills are linked automatically by `nosam init` when it detects a supported
agent's configuration. For example, Claude Code uses `.claude/skills/` and Codex
uses `.agents/skills/`. The skills use the app's installed docs so their guidance
matches its Nosam version. Globally installed skills can use the docs in their
Nosam package when there is no local installation. If no agent is detected, the
instructions still point directly to the bundled docs.
