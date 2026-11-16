import type { Manifest, ManifestEntry } from '@eeao/core';

type Io = {
  argv: Array<string>;
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
};

type Prop = {
  type?: string | Array<string>;
  description?: string;
  enum?: Array<unknown>;
  items?: Prop;
  anyOf?: Array<Prop>;
};

const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();

function typeOf(p: Prop): string {
  const t = Array.isArray(p.type) ? p.type.find((x) => x !== 'null') : p.type;
  if (t) {
    return t;
  }
  if (p.enum?.every((v) => typeof v === 'string')) {
    return 'string';
  }
  if (p.anyOf) {
    const types = p.anyOf.map(typeOf).filter((x) => x !== 'null');
    if (types.length === 1) {
      return types[0]!;
    }
  }
  return 'json';
}

class UsageError extends Error {}

function parseArgs(argv: Array<string>) {
  const words: Array<string> = [];
  const flags: Array<[string, string | true]> = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') {
      words.push(...argv.slice(i + 1));
      break;
    }
    if (a === '-h') {
      flags.push(['help', true]);
    } else if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) {
        flags.push([a.slice(2, eq), a.slice(eq + 1)]);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags.push([a.slice(2), next]);
          i++;
        } else {
          flags.push([a.slice(2), true]);
        }
      }
    } else {
      words.push(a);
    }
  }
  return { words, flags };
}

function coerce(name: string, prop: Prop, raw: string | true): unknown {
  const t = typeOf(prop);
  if (t === 'boolean') {
    if (raw === true || raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    throw new UsageError(`--${name} takes true or false`);
  }
  if (raw === true) {
    throw new UsageError(`--${name} needs a value`);
  }
  if (t === 'number' || t === 'integer') {
    const n = Number(raw);
    if (!Number.isFinite(n) || (t === 'integer' && !Number.isInteger(n))) {
      throw new UsageError(`--${name} must be ${t === 'integer' ? 'an integer' : 'a number'}`);
    }
    return n;
  }
  if (t === 'string') {
    if (prop.enum && !prop.enum.includes(raw)) {
      throw new UsageError(`--${name} must be one of: ${prop.enum.join(', ')}`);
    }
    return raw;
  }
  if (t === 'array' && !raw.trim().startsWith('[')) {
    return [coerce(name, prop.items ?? {}, raw)];
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new UsageError(`--${name} must be JSON`);
  }
}

function inputFromFlags(entry: ManifestEntry, flags: Array<[string, string | true]>): unknown {
  const schema = (entry.input ?? {}) as {
    properties?: Record<string, Prop>;
    required?: Array<string>;
  };
  const props = schema.properties ?? {};
  const byFlag = new Map(Object.keys(props).map((k) => [kebab(k), k]));
  const input: Record<string, unknown> = {};
  for (const [flag, raw] of flags) {
    if (flag === 'json') {
      if (raw === true) {
        throw new UsageError('--json needs a value');
      }
      try {
        Object.assign(input, JSON.parse(raw));
      } catch {
        throw new UsageError('--json must be a JSON object');
      }
      continue;
    }
    const negated = flag.startsWith('no-') && byFlag.has(flag.slice(3));
    const key = byFlag.get(negated ? flag.slice(3) : flag);
    if (!key) {
      const known = [...byFlag.keys()].map((f) => `--${f}`).join(', ') || '(none)';
      throw new UsageError(`unknown flag --${flag} for "${entry.cli!.command}". Flags: ${known}`);
    }
    const prop = props[key]!;
    if (negated) {
      if (typeOf(prop) !== 'boolean') {
        throw new UsageError(`--${flag} only works for true/false flags`);
      }
      input[key] = false;
      continue;
    }
    const value = coerce(flag, prop, raw);
    input[key] =
      typeOf(prop) === 'array' &&
      Array.isArray(input[key]) &&
      !(typeof raw === 'string' && raw.trim().startsWith('['))
        ? [...(input[key] as Array<unknown>), ...(value as Array<unknown>)]
        : value;
  }
  const missing = (schema.required ?? []).filter((k) => input[k] === undefined);
  if (missing.length) {
    throw new UsageError(`missing ${missing.map((k) => `--${kebab(k)}`).join(', ')}`);
  }
  return entry.input ? input : undefined;
}

function commandHelp(entry: ManifestEntry): string {
  const schema = (entry.input ?? {}) as {
    properties?: Record<string, Prop>;
    required?: Array<string>;
  };
  const lines = [`${entry.cli!.command}: ${entry.cli!.description}`, ''];
  const props = Object.entries(schema.properties ?? {});
  if (!props.length) {
    lines.push('  (no flags)');
  }
  for (const [k, p] of props) {
    const req = schema.required?.includes(k) ? ' (required)' : '';
    const t = p.enum ? p.enum.join('|') : typeOf(p);
    lines.push(`  --${kebab(k)} <${t}>${req}${p.description ? `  ${p.description}` : ''}`);
  }
  lines.push('  --json <object>  pass the whole input as JSON');
  const errs = Object.entries(entry.errors);
  if (errs.length) {
    lines.push('', 'Errors:', ...errs.map(([c, s]) => `  ${c} (${s.status}) ${s.message}`));
  }
  return lines.join('\n') + '\n';
}

function listHelp(manifest: Manifest): string {
  const cmds = manifest.procedures
    .map((p) => p.cli!)
    .sort((a, b) => a.command.localeCompare(b.command));
  const width = Math.max(0, ...cmds.map((c) => c.command.length));
  return (
    [
      'Usage: eeao [--url URL] [--token TOKEN] <command> [flags]',
      '       EEAO_URL and EEAO_TOKEN are read from the environment.',
      '',
      'Commands:',
      ...cmds.map((c) => `  ${c.command.padEnd(width)}  ${c.description}`),
      '',
      'Run "eeao <command> --help" for its flags.',
    ].join('\n') + '\n'
  );
}

/**
 * Runs the CLI and returns the exit code: 0 on success, 1 when the call failed, 2 for usage errors.
 * The CLI never imports handlers. It downloads the manifest and calls the Worker over HTTP.
 */
export async function run(io: Io): Promise<number> {
  const f = io.fetch ?? fetch;
  const { words, flags } = parseArgs(io.argv);
  const take = (name: string) => {
    const i = flags.findIndex(([k]) => k === name);
    if (i < 0) {
      return undefined;
    }
    const [, v] = flags.splice(i, 1)[0]!;
    return v;
  };
  const url = (take('url') as string | undefined) ?? io.env.EEAO_URL;
  const token = (take('token') as string | undefined) ?? io.env.EEAO_TOKEN;
  const basePath = io.env.EEAO_BASE_PATH ?? '/rpc';
  const help = take('help') !== undefined || words[0] === 'help';
  if (words[0] === 'help') {
    words.shift();
  }

  if (!url) {
    io.stderr('eeao: set --url or EEAO_URL to your Worker, e.g. https://api.example.com\n');
    return 2;
  }
  const origin = url.replace(/\/$/, '');
  let manifest: Manifest;
  try {
    const res = await f(`${origin}${basePath}/manifest.json`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    manifest = (await res.json()) as Manifest;
  } catch (e) {
    io.stderr(`eeao: could not load ${origin}${basePath}/manifest.json: ${(e as Error).message}\n`);
    return 1;
  }

  const entry = manifest.procedures
    .filter((p) => {
      const parts = p.cli!.command.split(' ');
      return parts.every((w, i) => words[i] === w);
    })
    .sort((a, b) => b.cli!.command.length - a.cli!.command.length)[0];

  if (!entry) {
    if (words.length && !help) {
      io.stderr(`eeao: unknown command "${words.join(' ')}"\n\n`);
    }
    (words.length && !help ? io.stderr : io.stdout)(listHelp(manifest));
    return words.length && !help ? 2 : 0;
  }
  const extra = words.slice(entry.cli!.command.split(' ').length);
  if (help) {
    io.stdout(commandHelp(entry));
    return 0;
  }
  if (extra.length) {
    io.stderr(
      `eeao: unexpected argument "${extra[0]}". Pass values as flags.\n\n${commandHelp(entry)}`,
    );
    return 2;
  }

  let input: unknown;
  try {
    input = inputFromFlags(entry, flags);
  } catch (e) {
    if (!(e instanceof UsageError)) {
      throw e;
    }
    io.stderr(`eeao: ${e.message}\n\n${commandHelp(entry)}`);
    return 2;
  }

  const res = await f(`${origin}${entry.path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-eeao-surface': 'cli',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: input === undefined ? '' : JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: unknown;
    error?: { code: string; message: string; issues?: Array<{ path: string; message: string }> };
  };
  if (res.ok && !body.error) {
    io.stdout(JSON.stringify(body.data, null, 2) + '\n');
    return 0;
  }
  const err = body.error ?? { code: 'INTERNAL', message: `HTTP ${res.status}` };
  io.stderr(`error ${err.code}: ${err.message}\n`);
  for (const i of err.issues ?? []) {
    io.stderr(`  ${i.path ? `--${kebab(i.path.split('.')[0]!)}` : 'input'}: ${i.message}\n`);
  }
  if (res.status === 401) {
    io.stderr('Set --token or EEAO_TOKEN to an API token.\n');
  }
  return 1;
}
