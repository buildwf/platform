# bwf

Forked from [Void](https://github.com/voidzero-dev/void) by Cloudflare.

Build and deploy React single-page apps with an optional backend using [Vite](https://vite.dev), running on Cloudflare Workers.

bwf brings together three open-source tools for you and your coding agents:

- **bwf SDK:** Build a React single-page app and its backend together with file-based API routes and typed APIs for databases, storage, and AI. Carry types from database queries to the UI.
- **bwf CLI:** Build your app, provision the Cloudflare resources it uses, apply migrations, and deploy with one command. Manage resources, inspect logs, and roll back through the same CLI.
- **bwf Platform:** Install a shared deployment environment in your Cloudflare account for your team or customers, with access controls, resource limits, usage reporting, and [connected applications](./docs/guide/platform/administration/connected-apps.md) that request user-approved deployments.

The SDK's features are optional and composable. Start with a plain React SPA and add API routes, a database, auth, jobs, or other features when you need them.

## Getting Started

Use Node.js 24.22+ or 26.12+. In an empty directory, run:

```sh
npm install -D @buildwf/bwf
npx bwf init
npm run dev
```

Vite+ is the default toolchain; setup installs it for you and keeps your existing package-manager configuration. Choose a starter, then select Cloudflare to deploy to your account:

```sh
npx bwf deploy
```

bwf builds the app, provisions resources, applies database migrations, and prints your deployed URL. Follow the Quickstart for your first app or to add bwf to an existing Vite project.

To deploy to a team platform, run `npx bwf connect <url>` first, then use the same deploy command. See Install a bwf Platform to host one in your Cloudflare account or customize its open-source runtime.

## Documentation

Read the bwf documentation online or use the Markdown guides and references in `node_modules/@buildwf/bwf/docs/`, included with the `bwf` package.

`bwf init` adds a minimal `AGENTS.md` in new projects and asks before changing instructions in existing projects. It also links bundled skills for detected coding agents.

- Server routes and app types
- Database and type safety
- Deployment
- API and CLI reference
- Coding agents

## Contributing

```sh
git clone https://github.com/voidzero-dev/void.git
cd void
vp install
vp run build:all
```

Use `vp run dev:docs` to preview the docs. See [TESTING.md](./TESTING.md) for verification, Platform Development for platform changes, and [operations](./platform/meta/operations.md) for repository deployments.

## License

[MIT](./LICENSE). bwf is a fork of [Void](https://github.com/voidzero-dev/void), and the original Cloudflare copyright notice is kept in the license and in [NOTICE](./NOTICE).
