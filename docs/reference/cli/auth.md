---
description: 'Connect the CLI to Cloudflare or a bwf platform, and sign in to the account that receives deploys.'
outline: deep
---

# Connections and Authentication {#connect}

```sh
bwf connect
bwf connect platform.example.com
bwf connect --platform cloudflare
bwf connect --platform void
```

Connect a project to its deployment destination. With no arguments, choose Cloudflare or a bwf platform interactively. A URL selects a bwf platform directly. `--platform void` offers saved platforms and an option to enter another URL.

You can use a hostname: `bwf connect platform.example.com` connects over HTTPS. Loopback hosts (`localhost`, `127.0.0.1`, and `[::1]`) default to HTTP, so use `bwf connect localhost:8787` for a local platform. This also works in the interactive prompt. Include a scheme to override the default, for example `bwf connect https://localhost:8787`.

For Cloudflare, bwf signs in through the browser when needed, selects an accessible account, and saves `cloudflare.account_id` in `bwf.config.ts` or resolved state in `bwf.lock.json`. It shares this setup with `bwf init`. An existing account selection is preserved; conflicting or inaccessible account settings must be resolved before continuing.

For a bwf platform, bwf checks the connection and signs you in through your browser when needed. It saves credentials in your system keychain separately for each platform.

The deployment preference is saved in `.bwf/project.json`. Connecting to another bwf platform preserves an existing project link; the CLI explains when that link or an environment override still selects a different destination. Use `bwf project link` to explicitly choose a project. Cloudflare selection also retains existing bwf project metadata so you can switch back later.

In a non-interactive shell, supply a URL or explicit target. Cloudflare requires usable credentials and an unambiguous account (`CLOUDFLARE_ACCOUNT_ID` when needed). For a bwf platform, provide `BWF_TOKEN` with a matching `BWF_API_URL`, or reuse a valid origin-scoped keychain session. Use `bwf connect <url> --no-login` to save the verified connection without authenticating; this option is only available for bwf platforms.

## Authentication {#authentication}

`bwf auth login`, `bwf auth status`, and `bwf auth logout` use the destination
saved for the current project by `bwf init` or `bwf connect`. If no destination
is saved, interactive commands let you choose Cloudflare or a connected bwf
platform. In a non-interactive shell, pass `--platform cloudflare|void` or use
the explicit `bwf cloudflare` and `bwf account` commands. Choosing a destination
for authentication does not change the project's deploy target.

## bwf platform account {#platform-account}

### `bwf account login` {#platform-account-login}

Browser login through one of the platform's currently enabled methods. The token is saved in the operating-system keychain, scoped to the platform origin. Login fails closed when no keychain is available instead of writing the token to a plaintext file; headless environments use `BWF_TOKEN` from their secret manager.

Connect to a platform with `bwf connect <url>` before logging in. If an older project link has no platform URL, connect and run `bwf project link` to select its project again.

Set `BWF_API_URL` alongside `BWF_TOKEN` to identify the platform that issued it.
Both the URL and token are required for environment-based authentication, and the
URL must already be connected. In a fresh CI environment, run
`bwf connect "$BWF_API_URL" --no-login` before deploying. To use a platform's
saved login instead, unset `BWF_TOKEN`.

This is optional if you already completed auth during `bwf connect` or the interactive `bwf init` flow.

### `bwf account link [connection-id]` {#platform-account-link-connection-id}

Link another enabled login method to your current account. Sign in again if your
session is no longer recent, complete the additional provider's browser login,
and confirm the displayed identity. With no connection ID, choose an enabled
method interactively. The optional dashboard exposes the same flow in **Account**.

### `bwf account logout` {#platform-account-logout}

Removes saved credentials.

### `bwf account whoami` {#platform-account-whoami}

Prints your current login.

### `bwf account token` {#platform-account-token}

Copies your human auth token to the system clipboard. It is intended for
interactive troubleshooting and remains subject to login-method revocation. Do
not combine it with a Cloudflare Access service token for CI; machine Access
proof cannot turn a human bwf token into an automation identity. Create a
project-scoped credential with `bwf project token create` instead.

## Cloudflare authentication {#cloudflare-authentication}

Use bwf's Cloudflare commands to sign in and manage credentials. No separate Cloudflare CLI is needed. Browser credentials are encrypted and protected by your system keychain.

- `bwf cloudflare login` — sign in through your browser or switch Cloudflare users.
- `bwf cloudflare status` — show your identity, credential source, accessible accounts, and deployment account.
- `bwf cloudflare logout` — remove the local browser session.

Interactive `bwf connect --platform cloudflare`, `bwf init`, and `bwf deploy --platform cloudflare` invoke the same login flow automatically when necessary. Non-interactive CI must set `CLOUDFLARE_API_TOKEN`.

Signing in changes the browser session, not `account_id` in the project configuration. Check `bwf cloudflare status` after switching users; if the new user cannot access the pinned account, resolve the project target separately before deploying.

An API token or global API key pair in the environment takes precedence over browser credentials. Explicit browser login stops with the names of these overrides; remove them from that shell before signing in. `status` reports the active credential source, and `logout` warns if environment credentials remain active. Explicit browser login requires an interactive terminal; automatic deployment checks continue to reuse valid sessions.
