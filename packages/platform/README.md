# @void/platform

Packaged runtime for Nosam Platform, a shared deployment environment for your team or customers in your Cloudflare account. The Nosam CLI uses this package to install and maintain the platform.

Your users can build and deploy apps without setting up separate Cloudflare accounts. Administrators control access, set resource limits, and inspect deployments and usage.

## Getting Started

Install the `void` CLI and start the guided platform setup:

```sh
npm install -D void
npx void platform install
```

Once the platform is installed, developers connect and deploy:

```sh
npx void connect api.example.com
npx void deploy
```

The platform is open source. Use it as provided, contribute improvements, or fork it to integrate your systems and customize deployment workflows.

## Documentation

- Installation and prerequisites
- Administration
- Maintenance and recovery
- Platform development

Read the Nosam documentation online or use the Markdown guides and references in `node_modules/void/docs/`, included with the `void` package.
