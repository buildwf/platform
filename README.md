# Nosam

Build and deploy React single-page apps with an optional backend using [Vite](https://vite.dev), running on Cloudflare Workers.

Nosam brings together three open-source tools for you and your coding agents:

- **Nosam SDK:** Build a React single-page app and its backend together with file-based API routes and typed APIs for databases, storage, and AI. Carry types from database queries to the UI.
- **Nosam CLI:** Build your app, provision the Cloudflare resources it uses, apply migrations, and deploy with one command. Manage resources, inspect logs, and roll back through the same CLI.
- **Nosam Platform:** Install a shared deployment environment in your Cloudflare account for your team or customers, with access controls, resource limits, usage reporting, and [connected applications](./docs/guide/platform/administration/connected-apps.md) that request user-approved deployments.

The SDK's features are optional and composable. Start with a plain React SPA and add API routes, a database, auth, jobs, or other features when you need them.

## Getting Started

Use Node.js 24.22+ or 26.12+. In an empty directory, run:

```sh
npm install -D void
npx void init
npm run dev
```

Vite+ is the default toolchain; setup installs it for you and keeps your existing package-manager configuration. Choose a starter, then select Cloudflare to deploy to your account:

```sh
npx void deploy
```

Nosam builds the app, provisions resources, applies database migrations, and prints your deployed URL. Follow the Quickstart for your first app or to add Nosam to an existing Vite project.

To deploy to a team platform, run `npx void connect <url>` first, then use the same deploy command. See Install a Nosam Platform to host one in your Cloudflare account or customize its open-source runtime.

## Documentation

Read the Nosam documentation online or use the Markdown guides and references in `node_modules/void/docs/`, included with the `void` package.

`void init` adds a minimal `AGENTS.md` in new projects and asks before changing instructions in existing projects. It also links bundled skills for detected coding agents.

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

MIT
