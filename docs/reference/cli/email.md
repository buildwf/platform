---
description: 'Inspect email usage and choose the recipients a project is allowed to send to.'
outline: deep
---

# Email {#email}

Inspect email usage and manage the recipients a project is allowed to send to. See [Email](../../guide/email.md) for the runtime API.

Project resolution for email commands follows the same order as deploy (`--project`, `NOSAM_PROJECT`, linked project). `nosam email setup` and `nosam email status --platform cloudflare` are the exception: they act on your own Cloudflare account through your Cloudflare sign-in (`nosam cloudflare login`) and need no Nosam project.

## `nosam email usage` {#nosam-email-usage}

```
nosam email usage [--project <name>]
```

Show the current month's recipient attempts and inbound receipts, the monthly attempt limit, and how much of it is left. Reserved submissions count toward the limit; started attempts remain charged even if delivery fails or its outcome is unknown. A suspended project is flagged in the output.

## `nosam email logs` {#nosam-email-logs}

```
nosam email logs [--limit <n>] [--project <name>]
```

Show recent email operation metadata retained for 30 days: timestamp, direction, operation ID, recipient, and state. `--limit` accepts 1–100. Subjects, bodies, and attachments are not stored. Provider acceptance does not confirm mailbox delivery; inspect unknown outcomes before retrying.

## `nosam email destinations` {#nosam-email-destinations}

```
nosam email destinations [--project <name>]
```

List the project's recipient addresses and their state (`verified`, `pending`, or `failed`). Outbound mail is only delivered to verified addresses.

## `nosam email allow` {#nosam-email-allow}

```
nosam email allow <address> [--project <name>]
```

Add one recipient to the project's destination list. Cloudflare emails that address a verification link — the recipient clicks it, with no Nosam or Cloudflare account required. Then run `nosam email destinations`: the listing is what records the click, and until it has, a send to that address returns `UNVERIFIED_DESTINATION` for that recipient. If the link did not arrive or has expired, run `nosam email allow <address>` again while the address is still pending — the CLI re-sends the link, or tells you how to get a fresh one.

The project owner's email is added automatically when the project is created, so it skips this step but not the verification: unless Cloudflare already had it verified for an earlier project of yours, click the link it mailed and run `nosam email destinations`; until then a send to yourself returns `UNVERIFIED_DESTINATION` for that recipient.

## `nosam email disallow` {#nosam-email-disallow}

```
nosam email disallow <address> [--project <name>]
```

Remove one recipient from the project's destination list. New sends to that address are refused immediately; previously admitted attempts may finish. No deploy is involved.

## `nosam email alias` {#nosam-email-alias}

```
nosam email alias [--project <name>]
nosam email alias <name> [--yes] [--project <name>]
```

With no name, show the project's address on the platform's shared mail domain and whether inbound mail reaches it.

As the project owner, run `nosam email alias acme` to send and receive at `acme@<mail domain>` and `acme+<tag>@<mail domain>`. Choose an available name that follows the project slug rules. Names of five characters or fewer require a plan that allows short names.

An alias is permanent and reserved until the project is deleted. The original slug address keeps working. The CLI asks for confirmation; use `--yes` in scripts and CI.

Before sharing the alias, redeploy with the current Nosam version so handlers receive the expected `message.to` address. Inbound mail starts when the project's `email/` handlers and recipient rule are ready; run `nosam email alias` to check.

## `nosam email domain` {#nosam-email-domain}

```
nosam email domain <add|status|list|sync|rotate-secret|remove> [<domain>] [--project <name>]
```

Send and receive at your own domain on a Cloudflare zone you own, registered to the project. Nosam platform only — on your own Cloudflare account the mail domain comes from `email.from` instead (see `nosam email setup`). The walkthrough is [Your own domain on the platform](../../guide/email/domains.md#your-own-domain-on-the-platform).

### `nosam email domain add` {#nosam-email-domain-add}

```
nosam email domain add <domain> [--project <name>]
```

Register an exact domain with the project using a scoped Cloudflare API token. The CLI opens a token template, accepts a masked paste or newly copied token, and asks you to confirm account and zone restrictions. Credentials are encrypted for the zone connection. Custom inbound email requires a Cloudflare zone apex because its catch-all does not cover subdomains. Foreign MX records and catch-alls are preserved; use another zone apex or the platform shared mail address when the apex already receives mail. Each custom apex belongs to one project. Setup returns an operation ID so an interrupted request can be checked without restarting the operation.

### `nosam email domain status` {#nosam-email-domain-status}

```
nosam email domain status <domain> [--project <name>]
```

Show the recorded inbound, outbound, and management readiness, observation times, and latest operation. Use `sync` to reconcile setup and refresh readiness.

### `nosam email domain list` {#nosam-email-domain-list}

```
nosam email domain list [--project <name>]
```

List the project's registered email domains and readiness.

### `nosam email domain sync` {#nosam-email-domain-sync}

```
nosam email domain sync <domain> [--project <name>]
```

Reconcile the domain connection and refresh readiness. Sync does not rotate its secret. A blocked or uncertain operation exits unsuccessfully and names the operation to inspect.

### `nosam email domain rotate-secret` {#nosam-email-domain-rotate-secret}

```sh
nosam email domain rotate-secret <domain> [--project <name>]
```

Rotate the connection secret shared by this domain and other domains on the same zone. Inbound delivery must be ready; run `nosam email domain sync <domain>` first if setup is incomplete. Inspect an uncertain result before retrying.

### `nosam email domain remove` {#nosam-email-domain-remove}

```
nosam email domain remove <domain> [--project <name>]
```

Disable the domain assignment and record cleanup. Zone resources used by another domain remain available. Unfinished or uncertain cleanup remains recorded until it can be reconciled safely.

## `nosam email status` {#nosam-email-status}

```
nosam email status --platform cloudflare
```

Check the domain configured in `email.from`: permissions, DNS, routing, sending, handler addresses, and the email binding. Exits unsuccessfully when setup is incomplete. Workers Free setup can be ready with sending limited to verified destinations; run `nosam email setup --platform cloudflare` after upgrading to Workers Paid.

`nosam email status` reads only your own Cloudflare account, so `--platform cloudflare` is required. On the Nosam platform, use `nosam email usage` and `nosam email destinations`.

## `nosam email setup` {#nosam-email-setup}

```
nosam email setup --platform cloudflare
```

Set up email before deploying from CI. Requires `email.from` in `nosam.config.ts`, an interactive terminal, and Cloudflare email permissions.

Nosam shows the planned DNS, routing, plus-addressing, and sending changes and asks before applying them. Commit `nosam.lock.json`, then run `nosam deploy --platform cloudflare --require-email` in CI.

On Workers Free, inbound mail and sends to verified recipients remain available. Run this command again after upgrading to Workers Paid to enable arbitrary recipients. See [Email setup](../../guide/email/domains.md#your-own-cloudflare-account).
