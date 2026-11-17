---
description: 'Add, remove, and check custom domains for a hosted project or a direct Cloudflare deploy.'
outline: deep
---

# Custom Domains {#custom-domains}

## `nosam domain add` {#nosam-domain-add}

```
nosam domain add <hostname> [--project <name>]
```

Add a custom domain to the saved target. Hosted Nosam projects print the DNS records needed for SaaS hostname validation. Direct Cloudflare projects add a `custom_domain` route and immediately synchronize only the route configuration, leaving cron, queue, and workflow triggers unchanged; Cloudflare manages the DNS record and TLS certificate in a zone on the pinned account. Convert a legacy singular `route` field to a `routes` array first so adding the domain cannot shadow the existing route.

> Wildcard custom hostnames (`*.example.com`) are not supported — register each subdomain individually.

## `nosam domain delete` {#nosam-domain-delete}

```
nosam domain delete <hostname> [--project <name>]
```

Direct Cloudflare projects apply the change immediately. Deleting the final custom domain uses your browser session from `nosam cloudflare login` or an API token with Workers Scripts: Edit permission. If Cloudflare rejects the change, Nosam attempts to restore the previous domain configuration and reports whether recovery succeeded.

## `nosam domain list` {#nosam-domain-list}

```
nosam domain list [--project <name>]
```

List all custom domains. Hosted projects show active/pending state from the platform; direct Cloudflare projects list the custom-domain routes currently configured in `nosam.config.ts`.

## `nosam domain status` {#nosam-domain-status}

```
nosam domain status <hostname> [--project <name>] [--verbose]
```

Show domain verification and TLS certificate status, including DNS records to configure and any required action. Domains activate automatically once verification and certificate issuance finish.

For direct Cloudflare projects, status reports whether the route is present in the Nosam Cloudflare config. It does not claim to inspect remote certificate issuance; Cloudflare owns that state and exposes it in the dashboard. `--project` is hosted-only.
