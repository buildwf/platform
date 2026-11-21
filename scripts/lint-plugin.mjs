import { allowedReason, allowsJsdoc, commentBlocks } from './comment-rules.mjs';

const noComments = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Bans comments except tool directives and `Decision:` records. See .claude/skills/delete-comment.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const { sourceCode } = context;
        const source = sourceCode.text;
        const comments = sourceCode.getAllComments().map((comment) => ({
          type: comment.type,
          value: comment.value,
          start: comment.range?.[0] ?? comment.start,
          end: comment.range?.[1] ?? comment.end,
        }));
        const file = context.filename.replaceAll('\\', '/');
        const allowJsdoc = allowsJsdoc(file);
        for (const block of commentBlocks(comments, source)) {
          if (allowedReason(block, { allowJsdoc, file }) || /^\s*$/.test(block.value)) {
            continue;
          }
          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(block.start),
              end: sourceCode.getLocFromIndex(block.end),
            },
            message:
              'Comments are banned. Delete it, or start it with "Decision:" when it records a non-obvious decision. File a Linear issue for a workaround.',
          });
        }
      },
    };
  },
};

export default {
  meta: { name: 'bwf' },
  rules: { 'no-comments': noComments },
};
