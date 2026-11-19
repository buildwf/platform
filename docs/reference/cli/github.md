---
description: 'Connect GitHub so pushes build and deploy, whichever way you signed in to bwf.'
outline: deep
---

# GitHub and Builds {#github}

Deploy-on-GitHub works from **any** bwf login — Google, GitHub, or other SSO. The first time you connect GitHub, bwf links your GitHub identity to your current account (a one-time step, independent of how you logged in); it never creates a second account.

Project-scoped `github` and `build` commands resolve the project in the same order as deploy: the `[project]` argument or `--project`, then `BWF_PROJECT`, then the linked project (`.bwf/project.json`).

## `bwf github link` {#platform-github-link}

```
bwf github link
```

Link your signed-in bwf account to GitHub through your browser. `bwf github install` does this automatically when needed.

::: warning Existing GitHub sign-in
A GitHub identity can belong to only one bwf account. If it is already linked elsewhere, sign in to that bwf account or authorize a different GitHub identity.
:::

## `bwf github install` {#platform-github-install}

```
bwf github install
```

Open the GitHub App install page in your browser. If your account has no linked GitHub identity yet, `bwf github install` first runs the GitHub link automatically (browser authorize), then continues. After installing, run `bwf github connect` to link a repository to your project.

## `bwf github installations` {#platform-github-installations}

```
bwf github installations
```

List all GitHub App installations linked to your account. Each entry includes the `[id: <installation_id>]` needed for `--installation` in non-interactive use.

## `bwf github join` {#platform-github-join}

```
bwf github join
```

Join an existing organization installation through your browser. `bwf github connect` can do this automatically in an interactive terminal. Run `join` locally before non-interactive setup when needed.

Requires a signed-in bwf account and organization-installation sharing enabled by your platform. Use `bwf github installations` to find the installation ID.

## `bwf github connect` {#platform-github-connect}

```
bwf github connect [project] [options]
```

Connect a GitHub repository to a bwf project for automatic deploys. On every push to the configured branch, bwf builds and deploys your project automatically.

The CLI opens your browser when it needs GitHub authorization. If no installation is available, run `bwf github install`.

**Options**

| Flag                  | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `--project <name>`    | Project name (alias for the positional argument)                                 |
| `--installation <id>` | GitHub App installation ID (required when you have multiple installations)       |
| `--repo <owner/repo>` | Repository full name — required unless the installation grants exactly one repo  |
| `--branch <name>`     | Branch to deploy from — **required in non-interactive mode**                     |
| `--executor <type>`   | Build executor: `container` (default) or `github_actions`                        |
| `--workflow <path>`   | Authorized deploy workflow file — defaults to `.github/workflows/bwf-deploy.yml` |

Choose `container` for platform builds or `github_actions` for a deployment workflow. The CLI prompts for the executor and, for GitHub Actions, the workflow file. Pass the corresponding flags to skip those prompts.

The workflow must be a `.yml` or `.yaml` file under `.github/workflows/`. Only that workflow can obtain the project's OIDC deployment token. Prefer a dedicated deployment workflow.

For CI, supply the project and branch, plus the installation and repository when they cannot be selected automatically. Organization connections require repository authorization in a local browser first.

```
bwf github connect my-app \
  --installation 42 \
  --repo owner/my-app \
  --branch main
```

You can connect only repositories your GitHub account can access.

A project has one GitHub connection. Running `bwf github connect` on a project that is already connected fails. To connect a different repository, run `bwf github disconnect` first.

## `bwf github update` {#platform-github-update}

```
bwf github update [project] [options]
```

Change the branch, executor, or workflow for an existing connection. To change the repository, disconnect and reconnect.

**Options**

| Flag                | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `--project <name>`  | Project name (alias for the positional argument)                 |
| `--branch <name>`   | New branch to deploy from                                        |
| `--executor <type>` | New build executor: `container` or `github_actions`              |
| `--workflow <path>` | New authorized deploy workflow file (under `.github/workflows/`) |

The CLI prompts for new settings using the current values as defaults. In CI, pass at least one of `--branch`, `--executor`, or `--workflow`.

```
bwf github update my-app --executor github_actions
```

## `bwf github status` {#platform-github-status}

```
bwf github status [project]
```

Show the connected repository, branch, executor, and workflow. Container builds do not use the workflow file.

**Options**

| Flag               | Description                                      |
| ------------------ | ------------------------------------------------ |
| `--project <name>` | Project name (alias for the positional argument) |

```
bwf github status my-app
```

## `bwf github disconnect` {#platform-github-disconnect}

```
bwf github disconnect [project]
```

Disconnect a project from its GitHub repository, stopping automatic deploys. Any in-flight builds for the project are cancelled before the connection is removed. If the project has no connection, it reports that and exits successfully. To point a project at a different repository, disconnect first, then run `bwf github connect`.

You are asked to confirm before anything is removed. Pass `--yes` to skip the prompt; `--yes` is **required** in a non-interactive shell (CI), where there is no prompt to answer.

**Options**

| Flag               | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `--project <name>` | Project name (alias for the positional argument)                  |
| `--yes`            | Skip the confirmation prompt (required in non-interactive shells) |

```
bwf github disconnect my-app --yes
```

## Build {#build}

Inspect Deploy-on-GitHub builds.

### `bwf build logs` {#platform-build-logs}

```
bwf build logs [build] [--follow] [--output <file>] [--project <slug>]
```

Stream, tail, or download the build logs for a **container** build. With no
`[build]` argument, targets the project's most recent build.

| Flag                     | Purpose                                                                   | Default |
| ------------------------ | ------------------------------------------------------------------------- | ------- |
| `--follow`, `-f`         | Live-tail: poll until the build finishes and its final logs are captured. | off     |
| `--output <file>`, `-o`  | Write logs to a file instead of stdout (appends while following).         | stdout  |
| `--project <slug>`, `-p` | Target project.                                                           | linked  |

Builds run on **GitHub Actions** keep their logs on GitHub — the command prints
the Actions run URL instead of streaming. Only the last 10,000 log lines of a
container build are retained.

Following waits for the platform to confirm the final log tail. If the platform cannot confirm it, upgrade the platform runtime or read the retained logs without `--follow`. An unfinished final tail reports an error after two minutes; retry to recover it.

Examples:

```
bwf build logs                     # print the latest build's logs
bwf build logs -f                  # follow the latest build until it finishes
bwf build logs bld_123 -o build.log  # download a specific build's logs
```
