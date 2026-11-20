---
description: 'Inspect email usage and choose the recipients a project is allowed to send to.'
outline: deep
---

# Email {#email}

Inspect email usage and manage the recipients a project is allowed to send to. See [Email](../../guide/email.md) for the runtime API.

Project resolution for email commands follows the same order as deploy (`--project`, `BWF_PROJECT`, linked project). `bwf email setup` and `bwf email status --platform cloudflare` are the exception: they act on your own Cloudflare account through your Cloudflare sign-in (`bwf cloudflare login`) and need no bwf project.

## `bwf email usage` {#platform-email-usage}

```
bwf email usage [--project <name>]
```

Show the current month's recipient attempts and inbound receipts, the monthly attempt limit, and how much of it is left. Reserved submissions count toward the limit; started attempts remain charged even if delivery fails or its outcome is unknown. A suspended project is flagged in the output.

## `bwf email logs` {#platform-email-logs}

```
bwf email logs [--limit <n>] [--project <name>]
```

Show recent email operation metadata retained for 30 days: timestamp, direction, operation ID, recipient, and state. `--limit` accepts 1–100. Subjects, bodies, and attachments are not stored. Provider acceptance does not confirm mailbox delivery; inspect unknown outcomes before retrying.

## `bwf email destinations` {#platform-email-destinations}

```
bwf email destinations [--project <name>]
```

List the project's recipient addresses and their state (`verified`, `pending`, or `failed`). Outbound mail is only delivered to verified addresses.

## `bwf email allow` {#platform-email-allow}

```
bwf email allow <address> [--project <name>]
```

Add one recipient to the project's destination list. Cloudflare emails that address a verification link — the recipient clicks it, with no bwf or Cloudflare account required. Then run `bwf email destinations`: the listing is what records the click, and until it has, a send to that address returns `UNVERIFIED_DESTINATION` for that recipient. If the link did not arrive or has expired, run `bwf email allow <address>` again while the address is still pending — the CLI re-sends the link, or tells you how to get a fresh one.

The project owner's email is added automatically when the project is created, so it skips this step but not the verification: unless Cloudflare already had it verified for an earlier project of yours, click the link it mailed and run `bwf email destinations`; until then a send to yourself returns `UNVERIFIED_DESTINATION` for that recipient.

## `bwf email disallow` {#platform-email-disallow}

```
bwf email disallow <address> [--project <name>]
```

Remove one recipient from the project's destination list. New sends to that address are refused immediately; previously admitted attempts may finish. No deploy is involved.

## `bwf email alias` {#platform-email-alias}

```
bwf email alias [--project <name>]
bwf email alias <name> [--yes] [--project <name>]
```

With no name, show the project's address on the platform's shared mail domain and whether inbound mail reaches it.

As the project owner, run `bwf email alias acme` to send and receive at `acme@<mail domain>` and `acme+<tag>@<mail domain>`. Choose an available name that follows the project slug rules. Names of five characters or fewer require a plan that allows short names.

An alias is permanent and reserved until the project is deleted. The original slug address keeps working. The CLI asks for confirmation; use `--yes` in scripts and CI.

Before sharing the alias, redeploy with the current bwf version so handlers receive the expected `message.to` address. Inbound mail starts when the project's `email/` handlers and recipient rule are ready; run `bwf email alias` to check.

## `bwf email domain` {#platform-email-domain}

```
bwf email domain <add|status|list|sync|rotate-secret|remove> [<domain>] [--project <name>]
```

Send and receive at your own domain on a Cloudflare zone you own, registered to the project. bwf platform only — on your own Cloudflare account the mail domain comes from `email.from` instead (see `bwf email setup`). The walkthrough is [Your own domain on the platform](../../guide/email/domains.md#your-own-domain-on-the-platform).

### `bwf email domain add` {#platform-email-domain-add}

```
bwf email domain add <domain> [--project <name>]
```

Register an exact domain with the project using a scoped Cloudflare API token. The CLI opens a token template, accepts a masked paste or newly copied token, and asks you to confirm account and zone restrictions. Credentials are encrypted for the zone connection. Custom inbound email requires a Cloudflare zone apex because its catch-all does not cover subdomains. Foreign MX records and catch-alls are preserved; use another zone apex or the platform shared mail address when the apex already receives mail. Each custom apex belongs to one project. Setup returns an operation ID so an interrupted request can be checked without restarting the operation.

### `bwf email domain status` {#platform-email-domain-status}

```
bwf email domain status <domain> [--project <name>]
```

Show the recorded inbound, outbound, and management readiness, observation times, and latest operation. Use `sync` to reconcile setup and refresh readiness.

### `bwf email domain list` {#platform-email-domain-list}

```
bwf email domain list [--project <name>]
```

List the project's registered email domains and readiness.

### `bwf email domain sync` {#platform-email-domain-sync}

```
bwf email domain sync <domain> [--project <name>]
```

Reconcile the domain connection and refresh readiness. Sync does not rotate its secret. A blocked or uncertain operation exits unsuccessfully and names the operation to inspect.

### `bwf email domain rotate-secret` {#platform-email-domain-rotate-secret}

```sh
bwf email domain rotate-secret <domain> [--project <name>]
```

Rotate the connection secret shared by this domain and other domains on the same zone. Inbound delivery must be ready; run `bwf email domain sync <domain>` first if setup is incomplete. Inspect an uncertain result before retrying.

### `bwf email domain remove` {#platform-email-domain-remove}

```
bwf email domain remove <domain> [--project <name>]
```

Disable the domain assignment and record cleanup. Zone resources used by another domain remain available. Unfinished or uncertain cleanup remains recorded until it can be reconciled safely.

## `bwf email status` {#platform-email-status}

```
bwf email status --platform cloudflare
```

Check the domain configured in `email.from`: permissions, sending, and the email binding, plus routing and handler addresses when the app has `email/` handlers. Exits unsuccessfully when setup is incomplete or cannot be verified. Sending-only apps need an onboarded sending domain. Apps with inbound handlers can be ready on Workers Free with sending limited to verified destinations; run `bwf email setup --platform cloudflare` after upgrading to Workers Paid.

`bwf email status` reads only your own Cloudflare account, so `--platform cloudflare` is required. On the bwf platform, use `bwf email usage` and `bwf email destinations`.

## `bwf email setup` {#platform-email-setup}

```
bwf email setup --platform cloudflare
```

Set up email before deploying from CI. Requires `email.from` in `bwf.config.ts`, an interactive terminal, and Cloudflare email permissions.

bwf shows the planned changes and asks before applying them. Apps without `email/` handlers configure sending only; routing and plus addressing are left alone. Commit `bwf.lock.json`, then run `bwf deploy --platform cloudflare --require-email` in CI.

On Workers Free, apps with `email/` handlers keep inbound mail and sends to verified recipients. Sending-only apps need Email Sending, which requires Workers Paid. Run this command again after upgrading to Workers Paid to enable arbitrary recipients. See [Email setup](../../guide/email/domains.md#your-own-cloudflare-account).
