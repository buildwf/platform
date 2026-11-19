# @builtbyfriends/platform

Packaged runtime for bwf Platform, a shared deployment environment for your team or customers in your Cloudflare account. The bwf CLI uses this package to install and maintain the platform.

Your users can build and deploy apps without setting up separate Cloudflare accounts. Administrators control access, set resource limits, and inspect deployments and usage.

## Getting Started

Install the `bwf` CLI and start the guided platform setup:

```sh
npm install -D @builtbyfriends/bwf
npx bwf platform install
```

Once the platform is installed, developers connect and deploy:

```sh
npx bwf connect api.example.com
npx bwf deploy
```

The platform is open source. Use it as provided, contribute improvements, or fork it to integrate your systems and customize deployment workflows.

## Documentation

- Installation and prerequisites
- Administration
- Maintenance and recovery
- Platform development

Read the bwf documentation online or use the Markdown guides and references in `node_modules/@builtbyfriends/bwf/docs/`, included with the `bwf` package.
