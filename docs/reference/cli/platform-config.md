---
description: 'Create and edit platform plans and their limits from an administrator session.'
outline: deep
---

# Platform Configuration {#plan-configuration}

Use your administrator session for these commands. See [Platform Management](./platform.md#operator-commands) for platform selection, previews, and confirmation.

`nosam platform config plans` opens an interactive plan menu using your administrator session. Plans have stable IDs and editable display names. Copy an existing plan to add one, edit limits without redeploying, archive it to stop new assignments, or remove it with an explicit replacement for its accounts.

```sh
nosam platform config plans show [plan-id]
nosam platform config plans add <plan-id> --copy <existing-id> --name "Team"
nosam platform config plans set <plan-id> [--name "Team"] [--file plan.json]
nosam platform config plans reset <builtin-plan-id>
nosam platform config plans archive <plan-id>
nosam platform config plans restore <plan-id>
nosam platform config plans remove <plan-id> [--replacement <plan-id>]
nosam platform config plans default <plan-id>
nosam platform config plans sync
```

Use `--plan` to preview changes and affected accounts; scripted mutations require `--yes`. Every command supports `--connection <slug-or-url>` and `--json`. `show` reports the effective limits, default, assignments, and pending account and AI logging updates. `show <plan-id>` also reports the plan's AI Gateway logging default. `reset` restores a built-in plan's original limits and build instance size. Archived plans keep their existing accounts but cannot receive new assignments; change the default before archiving it. `remove` requires a replacement for a plan that has accounts or is the default. Changing the default affects new accounts, plus the AI Gateway logging of accounts whose plan is not in the catalog.

For `add` and `set`, `--file` reads a JSON object with optional `name`, `limits`, `buildInstanceType`, and boolean `allowShortSlugs`. `limits` is a partial object of nonnegative whole numbers; `0` means unlimited by the plan. Build timeouts remain capped at the platform maximum of 60 minutes; `0` uses that maximum. Omitted settings keep their current values or the copied plan's values. `buildInstanceType` is `standard-3` or `standard-4`. `allowShortSlugs` permits future assignments of project slugs of five characters or fewer; existing URLs remain available. `aiLogging` sets the plan's [AI Gateway logging](./platform-users.md#ai-gateway-logging) default: `off`, `metadata`, or `full`. `"inherit"` clears it; leaving it out keeps the current value. Storage quotas are not editable. See [Plans and Limits](../../guide/platform/administration/plans.md) for supported limits and examples.

An apply checks the preview's revision and rejects concurrent changes. Lower quotas can restrict accounts already above them; usage history and billing periods are preserved. The CLI continues account updates and AI logging publishing until complete, then prints how many projects received the AI logging default and when new requests are expected to follow it. If an update fails or stops making progress, the configuration remains saved and the command exits unsuccessfully. Run `sync --yes` to continue before editing plans again. Inspect `show` and operator events after an uncertain request outcome.

## Authentication configuration {#authentication-configuration}

`nosam platform config auth` opens interactive configuration. These commands use
your administrator session from `nosam platform auth login`:

```sh
nosam platform config auth list
nosam platform config auth show company
nosam platform config auth add google
nosam platform config auth add oidc --id company
nosam platform config auth add cloudflare-access --id access
nosam platform config auth configure company
nosam platform config auth test company
nosam platform config auth link company
nosam platform config auth enable company
nosam platform config auth disable github
nosam platform config auth admission
nosam platform config auth protection show
nosam platform config auth protection enable --installation <id>
nosam platform config auth protection disable --installation <id>
nosam platform config auth recover company --installation <id> --file recovery.json
```

When configuring an existing installation for the first time, run
`nosam platform config auth initialize`, then sign in again. Its current login
methods and signup policy are preserved.

Adding or editing a method saves a pending configuration. Enabling it verifies the
login in your browser before applying it. Linking the verified identity to your
account is a separate, explicit action. Before disabling a method, verify a linked
alternative; the last method cannot be disabled. Disabling revokes human sessions
created through that method, including operator sessions. Scoped deployment tokens
remain valid; a human login token used as `NOSAM_TOKEN` is still revoked.

Commands accept `--connection <slug-or-url>` and `--json`. Changes accept
`--plan` or `--yes`. For scripted configuration, use `--file <path>` for the
nonsecret fields and `--client-secret-env <name>` for the environment variable
containing the secret. Omit the secret when editing to retain its saved value.
For `enable` or `link` in scripts, supply `--test-id <id>` from a completed test.
`test --json` returns a browser URL, test ID, and expiry without waiting for completion.

`admission` chooses invited/allowlisted, company-approved, or public signup.
Company-approved signup creates ordinary accounts automatically when a user
passes a configured company rule. Select an enabled, company-restricted OIDC or
Google Workspace method, or an enabled Cloudflare Access gate. In scripts,
`admission --file <path> --yes` reads a policy such as
`{"mode":"company","connections":["company"],"access":false}`.

`protection enable` creates or connects Cloudflare Access applications independently
of login methods. Its `--file` accepts the `cloudflareAccess` object described in
[installation setup](../../guide/platform/installation/setup.md#choose-login-methods).
Protection changes require installation ownership, the saved recovery credentials,
and a human administrator session. They revoke current human sessions. Before
removing protection, change any signup rule that depends on that gate. Cloudflare
applications are retained for deliberate cleanup.

`recover <connection-id>` restores an existing administrator when normal login is
unavailable. Its file contains `administratorUserId`, optional nonsecret provider
`configuration`, and an `expectedIdentity` object with exact `issuer` and `subject`
when using `--yes`. Recovery requires Cloudflare management/database authority,
original recovery keys, and a successful browser provider test. Use
`--client-secret-env <name>` for new or rotated credentials.

For automation, see [operator authentication](./platform.md#operator-authentication).
