/** A concrete destination that can execute a bwf deployment. */
export type DeployTarget = 'cloudflare' | 'platform';

export type DeployAppType = 'platform' | 'spa' | 'static';

/**
 * @deprecated bwf does not read deploy target capabilities. Removed in the
 * next major version.
 */
export type DeployCapabilitySupport = 'supported' | 'partial' | 'unsupported';

/**
 * @deprecated bwf does not read deploy target capabilities. They do not gate
 * deploys or appear in diagnostics. Removed in the next major version.
 */
export type DeployTargetCapabilities = {
  managedProjects: boolean;
  skipBuild: boolean;
  appTypes: Readonly<Record<DeployAppType, DeployCapabilitySupport>>;
  features: Readonly<{
    auth: DeployCapabilitySupport;
    cron: DeployCapabilitySupport;
    queues: DeployCapabilitySupport;
    durableState: DeployCapabilitySupport;
    webSockets: DeployCapabilitySupport;
    live: DeployCapabilitySupport;
    sandbox: DeployCapabilitySupport;
    remoteDevelopment: DeployCapabilitySupport;
    deploymentHistory: DeployCapabilitySupport;
    rollback: DeployCapabilitySupport;
    secrets: DeployCapabilitySupport;
    domains: DeployCapabilitySupport;
    logs: DeployCapabilitySupport;
  }>;
};

/**
 * Boundary implemented by deployment targets.
 *
 * Build classification and packaging stay outside the adapter; provider
 * credentials, resource names, remote ids, and execution stay inside it.
 */
export type DeployTargetAdapter<TOptions, TContext> = {
  readonly target: DeployTarget;
  /** @deprecated bwf ignores this field. Removed in the next major version. */
  readonly capabilities: DeployTargetCapabilities;
  deploy(root: string, options: TOptions, context: TContext): Promise<void>;
};
