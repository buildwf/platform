// Decision: shared by the no-comments lint rule (scripts/lint-plugin.mjs) and scripts/comments.ts,
// so the rule, the stripper and the upstream sync agree on which comments may stay. Plain JS
// because oxlint loads its JS plugins without a TypeScript step.

const directive =
  /^(?:\s*\*?\s*)(?:eslint-|eslint |oxlint-|@ts-|<reference |#__PURE__|@__PURE__|#__NO_SIDE_EFFECTS__|@__NO_SIDE_EFFECTS__|@vite-ignore|webpack[A-Z]|@vitest-environment|prettier-ignore|oxfmt-ignore|biome-ignore|istanbul |c8 |v8 |@jsx|@license|@preserve)/;

const license = /\b(Copyright|SPDX-License-Identifier|LICENSE)\b|\bMIT licen[sc]ed\b/;
const jsTypeTag =
  /@(type|typedef|param|returns?|template|satisfies|import|callback|property|this|enum|overload)\b/;

export const DECISION_PREFIX = 'Decision:';

function firstLine(value) {
  return value
    .replace(/^\*+/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trim())
    .find(Boolean);
}

export function isDirective(comment) {
  if (comment.type === 'Shebang' || comment.type === 'Hashbang') {
    return true;
  }
  if (comment.type === 'Block' && /^\s*global\s/.test(comment.value)) {
    return true;
  }
  if (comment.type === 'Line' && /^\/\s*</.test(comment.value)) {
    return true;
  }
  return directive.test(comment.value);
}

export function isDecision(value) {
  return firstLine(value)?.startsWith(DECISION_PREFIX) ?? false;
}

export function isJsdoc(comment) {
  return comment.type === 'Block' && comment.value.startsWith('*') && comment.value !== '*';
}

export function commentBlocks(comments, source) {
  const blocks = [];
  for (const comment of comments) {
    if (comment.start === 0 && source.startsWith('#!')) {
      continue;
    }
    const previous = blocks.at(-1);
    const gap = previous ? source.slice(previous.end, comment.start) : '';
    if (
      previous &&
      previous.type === 'Line' &&
      comment.type === 'Line' &&
      /^[ \t]*\r?\n[ \t]*$/.test(gap) &&
      !isDirective(comment) &&
      !previous.comments.some(isDirective)
    ) {
      previous.end = comment.end;
      previous.comments.push(comment);
      previous.value += `\n${comment.value}`;
      continue;
    }
    blocks.push({
      type: comment.type,
      start: comment.start,
      end: comment.end,
      value: comment.value,
      comments: [comment],
    });
  }
  return blocks;
}

export function allowedReason(block, { allowJsdoc = false, file = '' } = {}) {
  if (block.comments.every(isDirective)) {
    return 'directive';
  }
  if (isDecision(block.value)) {
    return 'decision';
  }
  if (license.test(block.value)) {
    return 'license';
  }
  // Decision: JS files that TypeScript checks take their types from JSDoc tags.
  if (/\.[cm]?jsx?$/.test(file) && isJsdoc(block) && jsTypeTag.test(block.value)) {
    return 'js-types';
  }
  if (allowJsdoc && isJsdoc(block)) {
    return 'api-doc';
  }
  return undefined;
}

// Decision: JSDoc in published package source turns into editor hover docs for people who build
// on bwf, so the lint rule allows it there.
export function allowsJsdoc(file) {
  return (
    /(^|\/)packages\/[^/]+\/src\//.test(file) &&
    !/(^|\/)(test|tests|__tests__|__mocks__|fixtures)\//.test(file) &&
    !/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}
