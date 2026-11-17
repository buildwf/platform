#!/usr/bin/env node
/* oxlint-disable */
// Token-aware rename of upstream "Void" to "nosam". Re-run after every upstream sync:
//   node scripts/rename-void-to-nosam.mjs [--dry] [--root <dir>] [--no-rename-files]
// It rewrites text files and renames paths in a git work tree. The JavaScript `void` keyword is never touched, and the
// upstream names in PROTECTED below (the vite-plus scope, the voidzero-dev GitHub links, docs on void.cloud) stay as
// they are. Safe to run twice: it only rewrites what is still named Void.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const renameFiles = !args.includes('--no-rename-files');
const rootIndex = args.indexOf('--root');
const root = rootIndex >= 0 ? args[rootIndex + 1] : process.cwd();

// Paths never rewritten: upstream attribution and history we want to keep verbatim.
const SKIP_PATHS = [/^LICENSE/, /^UPSTREAM$/, /^scripts\/rename-void-to-nosam\.mjs$/, /(^|\/)CHANGELOG\.md$/, /\/drizzle\//, /test\/unit\/(admin-upgrade-compatibility|email-shared-recipient-migration)\.test\.ts$/, /\.(png|jpe?g|gif|ico|webp|riv|woff2?|ttf|eot|zip|gz|wasm|pdf)$/i];

// Text left alone: masked before the rules run and restored after.
const PROTECTED = [
  /void_shared_email_recipient_teardown_guard|Database: void_platform/g, // names in historic migrations and pinned origin fixtures
  /void-nosam-api\.buildwithfriends\.workers\.dev/g, // the nosam installation's API host (also the replacement for api.void.cloud)
  /\['nosam-', 'void-'\]|startsWith\(`void-\$\{next\.id\}-`\)/g, // legacy resource prefix, accepted for installations made before the rename
  /(?<!x-)void-(?:proxy-token|proxy-internal|ai-usage|access:|shared-)/g, // HKDF/HMAC/hash domain strings and derived ids: live tokens and recipients depend on them
  /void-durable-/g, // Durable Object migration tags are recorded on deployed Workers
  /void-platform-health/g, // DNS label and Access app of live installations
  /hyperdrive_void_platform_service|'void_platform'/g, // pinned origin fixtures
  /(?:postgres(?:ql)?|mysql):\/\/[^\s'"`)]*/g, // fixture connection strings: their database and user names feed fingerprints that tests pin
  /(?:database|user): 'void[-_a-z]*'/g,
  /\b_{1,2}void_(?:platform_installation|migrations|migration_lock|migration_fences|migration_attempts)\b/g, // table names in live platform databases
  /(?<![\w-])void-[a-z0-9:-]*-v\d+\b/g, // versioned wire/persisted identifiers: Durable Object migration tags, hash and HKDF domains
  /html-void-elements/g, // third-party npm package
  /@?voidzero(-dev)?[\w./-]*/gi, // @voidzero-dev/vite-plus-*, voidzero-dev/void GitHub links, VoidZero (the company)
  /(?<![\w.-])void\.cloud(?=[/\s"'`)\]},.]|$)/g, // upstream docs links: https://void.cloud/guide/...
  /[\w.-]+\.void\.(cloud|app)\b/gi, // upstream hosted-service hostnames; the nosam equivalents are set in code, see README
  /\bvoid\.(cloud|app)\b/gi,
  /voidcloud\.dev/g,
];

const NOSAM_API_HOST = 'void-nosam-api.buildwithfriends.workers.dev';
const CMDS =
  'platform|deploy|project|db|email|connect|github|secret|account|init|gen|cloudflare|domain|dev|prepare|env|info|build|auth|migrate|help|context|login|logout|whoami|pull|push|logs|rollback|storage|queue|cron|kv|sandbox|ai|live|app|link|unlink|open|version|upgrade|doctor|skills|rpc|test|typecheck|lint|check|start|preview|install';
const CODE_FILE = /\.(m?[jt]sx?|cts|mts|vue|svelte)$/;
const BARE_QUOTED_OK = /\.(json|jsonc|ya?ml|md|mdx|toml|sh|txt|excalidraw|sql)$/;

function rewrite(text, file) {
  const masked = [];
  let out = text;
  for (const re of PROTECTED) {
    out = out.replace(re, (m) => {
      masked.push(m);
      return `\u0000P${masked.length - 1}\u0000`;
    });
  }
  const code = CODE_FILE.test(file);
  // Names with a visible boundary: voidPlugin, void/db, void.config.ts, .void, _void_migrations, void-test, voidcloud.
  out = out.replace(/(?<![A-Za-z])void(?=cloud\b)/g, 'nosam');
  out = out.replace(/(?<![A-Za-z])void(?=[A-Z])/g, 'nosam');
  out = out.replace(/(?<![A-Za-z])void(?=[-_/][A-Za-z0-9_@$(\[*])/g, 'nosam');
  out = out.replace(/(?<![A-Za-z])void(?=\.[A-Za-z]|\/|:[a-z])/g, 'nosam');
  out = out.replace(/(?<![A-Za-z0-9])(?<=[-_./@])void(?![A-Za-z])/g, 'nosam');
  out = out.replace(/(?<=[A-Za-z0-9])(?<=_)void(?![A-Za-z])/g, 'nosam');
  out = out.replace(/(?<=['"`])void-(?=['"`])/g, 'nosam-');
  // Escaped forms: regex sources (void\/db, void\.config, \bvoid\b) and \n-glued names in string literals.
  out = out.replace(/(?<![A-Za-z])void(?=\\[/.]|\(\?:|\(\\\\\/)/g, 'nosam');
  out = out.replace(/(?<=\\b)void(?=\\b)/g, 'nosam');
  out = out.replace(/(?<=\\[nrt])(VOID_)/g, 'NOSAM_').replace(/(?<=\\[nrt])void(?=[-_/.])/g, 'nosam');
  // PascalCase and CONSTANT_CASE.
  out = out.replace(/(?<![A-Z])Void(?![a-z])/g, 'Nosam');
  out = out.replace(/(?<![A-Za-z])VOID(?![A-Za-z])/g, 'NOSAM');
  // The bare package and binary name.
  if (BARE_QUOTED_OK.test(file)) {
    out = out.replace(/(?<=["'`])void(?=["'`])/g, 'nosam');
    out = out.replace(new RegExp(`(?<![\\w./-])void(?= (?:${CMDS})\\b(?![(.;]))`, 'g'), 'nosam');
    out = out.replace(/(?<=\b(?:add|install|i|npx|dlx|exec|bunx|create|uninstall|remove|link) (?:-[A-Za-z-]+ )*)void(?![\w-])/g, 'nosam');
    out = out.replace(/(?<=\bnpm (?:create|init) )void\b/g, 'nosam');
  }
  if (code) {
    out = out.replace(/(^[ \t]*|[{,] ?)void(?=\??: )/gm, '$1nosam'); // object keys and type members named void
    out = out.replace(/(?<=['"`])void(?=['"`:@])/g, 'nosam'); // 'void', 'void:secret-draft', `void@${version}`
    out = out.replace(/(?<=cloudflare(?: or |\|)|spa, static, |--platform |appType: |(?<= or ))void\b(?!\()/g, 'nosam');
    out = out.replace(/(?<=\[)void(?= [a-z]+ options)/g, 'nosam');
    out = out.replace(/(?<=[`'"]|\\n|: |\(|\bor )void(?= (?:<|--|\$\{|>|supports|manifest|`|\)))/g, 'nosam');
    out = out.replace(/(?<=cloudflare, )void(?=[,\s])/g, 'nosam');
    out = out.replace(new RegExp(`(?<=\\\\n)void(?= (?:${CMDS})\\b)`, 'g'), 'nosam');
    out = out.replace(new RegExp(`(?<=^[^\\n]*(?:[\`'"]|//|\\*).*)\\bvoid(?= (?:${CMDS})\\b(?![(.;\\w\\[]))`, 'gm'), 'nosam');
    out = out.replace(/(?<=Generated by |<code>)void(?= )/g, 'nosam');
    out = out.replace(/(?<=\bexec |\byarn )void(?='|`|\s|$)/gm, 'nosam');
    out = out.replace(/(?<==)void\b/g, 'nosam');
    out = out.replace(/(?<=`)void(?= %s)|(?<=Your )void(?= CLI)|(?<=describe\(')void(?= runtime)/g, 'nosam');
    out = out.replace(/(?<![A-Za-z])void(?=@(?:\d|\$\{|latest))/g, 'nosam');
    out = out.replace(/(?<=%(?:25)?2e)void/gi, 'nosam');
    out = out.replace(/(?<=\\\\)void(?=\\\\)/g, 'nosam');
    out = out.replace(/(?<=\b(?:from|import|require|resolve|import\.meta\.resolve)\(?\s*['"])void(?=['"])/g, 'nosam');
    out = out.replace(new RegExp(`(?<=(?:\`|['"]|[Rr]un |npx |\\$ |[Uu]sage: |pnpm |\`vp ))void(?= (?:${CMDS})\\b(?![(.;\\w]))`, 'g'), 'nosam');
    out = out.replace(/(?<=\b(?:npx|dlx|bunx) )void\b/g, 'nosam');
  }
  out = out.replace(/\u0000P(\d+)\u0000/g, (_, i) => masked[+i]);
  // Hosted-API default: the nosam installation replaces api.void.cloud. Staging and the other hosted-cloud hostnames
  // stay: they are the upstream operator's own deployment. Bare route patterns in wrangler files stay too.
  const bare = !/\.jsonc$|deployments\//.test(file);
  return out.replace(bare ? /(?<![\w.-])api\.void\.cloud\b/g : /(?<=https:\/\/)api\.void\.cloud\b/g, NOSAM_API_HOST);
}

function renamePath(path) {
  return path
    .split('/')
    .map((seg) => (seg === 'void' ? 'nosam' : /void/i.test(seg) && !/voidzero/i.test(seg) ? rewrite(seg, seg) : seg))
    .join('/');
}

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1 << 28 })
  .toString()
  .split('\0')
  .filter(Boolean);

let edited = 0;
const moves = [];
for (const f of files) {
  if (SKIP_PATHS.some((re) => re.test(f))) continue;
  const abs = join(root, f);
  if (!existsSync(abs) || statSync(abs).isSymbolicLink() || !statSync(abs).isFile()) continue;
  const buf = readFileSync(abs);
  if (buf.includes(0)) continue;
  const text = buf.toString('utf8');
  const next = /void/i.test(text) ? rewrite(text, f) : text;
  if (next !== text) {
    edited++;
    if (!dry) writeFileSync(abs, next);
  }
  const target = renamePath(f);
  if (renameFiles && target !== f && !SKIP_PATHS.some((re) => re.test(f))) moves.push([f, target]);
}

for (const [from, to] of moves) {
  if (dry) continue;
  mkdirSync(dirname(join(root, to)), { recursive: true });
  if (existsSync(join(root, to))) throw new Error(`rename target exists: ${to}`);
  try {
    execFileSync('git', ['mv', from, to], { cwd: root, stdio: 'pipe' });
  } catch {
    renameSync(join(root, from), join(root, to));
  }
}
console.log(`${dry ? 'would edit' : 'edited'} ${edited} files, ${dry ? 'would rename' : 'renamed'} ${moves.length} paths`);
