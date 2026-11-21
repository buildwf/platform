#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseSync } from 'rolldown/utils';
import { DECISION_PREFIX, allowedReason, allowsJsdoc, commentBlocks } from './comment-rules.mjs';

type Block = ReturnType<typeof commentBlocks>[number];

export type CommentEntry = {
  id: string;
  file: string;
  line: number;
  lines: number;
  kind: 'line' | 'block' | 'jsdoc';
  apiDoc: boolean;
  text: string;
  code: string;
};

export type CommentAction = {
  id: string;
  action: 'delete' | 'decision' | 'keep';
  text?: string;
};

const sourceFile = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const ignored = /(^|\/)(node_modules|dist)\/|\.generated\.ts$/;

function blocksOf(file: string, source: string): Array<Block> {
  const { comments } = parseSync(file, source);
  return commentBlocks(comments, source);
}

function lineAt(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index++) {
    if (source.charCodeAt(index) === 10) {
      line++;
    }
  }
  return line;
}

function codeAfter(source: string, end: number): string {
  return source
    .slice(end)
    .split('\n')
    .slice(1)
    .filter((line) => line.trim())
    .slice(0, 4)
    .join('\n');
}

function kindOf(block: Block): CommentEntry['kind'] {
  if (block.type === 'Line') {
    return 'line';
  }
  return block.value.startsWith('*') ? 'jsdoc' : 'block';
}

function plainText(block: Block): string {
  if (block.type === 'Line') {
    return block.comments.map((comment: { value: string }) => comment.value.trim()).join('\n');
  }
  return block.value
    .replace(/^\*+/, '')
    .split('\n')
    .map((line: string) => line.replace(/^\s*\*?\s?/, '').trimEnd())
    .join('\n')
    .trim();
}

export function trackedSources(paths: Array<string>): Array<string> {
  return execFileSync('git', ['ls-files', '--', ...paths], { encoding: 'utf8' })
    .split('\n')
    .filter((file) => sourceFile.test(file) && !ignored.test(file));
}

export function listComments(file: string, source = readFileSync(file, 'utf8')) {
  const apiDoc = allowsJsdoc(file);
  return blocksOf(file, source)
    .filter(
      (block) =>
        !allowedReason(block, { file }) && !(block.type === 'Block' && /^\s*$/.test(block.value)),
    )
    .map((block): CommentEntry => ({
      id: `${file}:${block.start}`,
      file,
      line: lineAt(source, block.start),
      lines: lineAt(source, block.end) - lineAt(source, block.start) + 1,
      kind: kindOf(block),
      apiDoc: apiDoc && kindOf(block) === 'jsdoc',
      text: plainText(block),
      code: codeAfter(source, block.end),
    }));
}

function cut(source: string, start: number, end: number, replacement = ''): string {
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = source.indexOf('\n', end);
  if (lineEnd === -1) {
    lineEnd = source.length;
  }
  const before = source.slice(lineStart, start);
  const after = source.slice(end, lineEnd);
  if (replacement) {
    return source.slice(0, start) + replacement + source.slice(end);
  }
  if (!before.trim() && !after.trim()) {
    return source.slice(0, lineStart) + source.slice(Math.min(lineEnd + 1, source.length));
  }
  if (!after.trim()) {
    return source.slice(0, start).replace(/[ \t]+$/, '') + source.slice(end);
  }
  return source.slice(0, start) + source.slice(end).replace(/^[ \t]+/, before.trim() ? ' ' : '');
}

function decisionComment(source: string, block: Block, text?: string): string {
  const lineStart = source.lastIndexOf('\n', block.start - 1) + 1;
  const lineEnd = source.indexOf('\n', block.end);
  const before = source.slice(lineStart, block.start);
  const after = source.slice(block.end, lineEnd === -1 ? source.length : lineEnd);
  const indent = before.match(/^\s*/)![0];
  const body = (text ?? plainText(block)).trim().replace(/^Decision:\s*/, '');
  const lines = `${DECISION_PREFIX} ${body}`.split('\n');
  if (before.trim() || after.trim()) {
    return `/* ${lines.join(`\n${indent}   `).replaceAll('*/', '* /')} */`;
  }
  return lines.map((line, index) => `${index ? indent : ''}// ${line}`.trimEnd()).join('\n');
}

export function applyActions(
  file: string,
  source: string,
  actions: Array<CommentAction>,
): { source: string; missing: Array<string> } {
  const blocks = new Map(blocksOf(file, source).map((block) => [`${file}:${block.start}`, block]));
  const missing: Array<string> = [];
  const found = actions
    .filter((action) => action.action !== 'keep')
    .map((action) => ({ action, block: blocks.get(action.id) }))
    .filter(({ action, block }) => block || !missing.push(action.id))
    .sort((a, b) => b.block!.start - a.block!.start);
  let result = source;
  for (const { action, block } of found) {
    result =
      action.action === 'delete'
        ? cut(result, block!.start, block!.end)
        : cut(result, block!.start, block!.end, decisionComment(result, block!, action.text));
  }
  return { source: result, missing };
}

export function stripComments(file: string, source: string): string {
  if (!sourceFile.test(file)) {
    return source;
  }
  const actions = listComments(file, source)
    .filter((entry) => !entry.apiDoc)
    .map((entry): CommentAction => ({ id: entry.id, action: 'delete' }));
  return applyActions(file, source, actions).source;
}

function countLines(paths: Array<string>): void {
  let total = 0;
  let shed = 0;
  let blocks = 0;
  for (const file of trackedSources(paths)) {
    const source = readFileSync(file, 'utf8');
    total += source.split('\n').length;
    const after = stripComments(file, source);
    shed += source.split('\n').length - after.split('\n').length;
    blocks += listComments(file, source).filter((entry) => !entry.apiDoc).length;
  }
  console.log(
    `${blocks} comment blocks, ${shed} of ${total} lines (${((shed / total) * 100).toFixed(1)}%) would go.`,
  );
}

function main(): void {
  const [command, ...args] = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const out = outIndex === -1 ? undefined : args.splice(outIndex, 2)[1];
  if (command === 'list') {
    const entries = trackedSources(args).flatMap((file) => listComments(file));
    const json = JSON.stringify(entries, null, 2);
    if (out) {
      writeFileSync(out, json);
      console.log(`${entries.length} comment blocks written to ${out}.`);
    } else {
      console.log(json);
    }
  } else if (command === 'apply' && args[0]) {
    const actions: Array<CommentAction> = JSON.parse(readFileSync(args[0], 'utf8'));
    const byFile = Map.groupBy(actions, (action) => action.id.slice(0, action.id.lastIndexOf(':')));
    let missing = 0;
    for (const [file, fileActions] of byFile) {
      const source = readFileSync(file, 'utf8');
      const result = applyActions(file, source, fileActions);
      if (result.source !== source) {
        writeFileSync(file, result.source);
      }
      for (const id of result.missing) {
        console.log(`not found (file changed since list?): ${id}`);
      }
      missing += result.missing.length;
    }
    console.log(`Applied ${actions.length - missing} actions in ${byFile.size} files.`);
    process.exitCode = missing ? 2 : 0;
  } else if (command === 'strip' && args.length) {
    for (const file of args) {
      writeFileSync(file, stripComments(file, readFileSync(file, 'utf8')));
    }
  } else if (command === 'count') {
    countLines(args);
  } else {
    console.log(
      'Usage: vp run comments list [paths] [--out file] | apply <actions.json> | strip <files> | count [paths]',
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main();
}
