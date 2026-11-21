#!/usr/bin/env node

// Decision: The bin entry. It imports only the dependency-free runtime check, so an unsupported Node
// or Bun gets a clear message instead of a link-time SyntaxError from a newer API in the
// bundled prompts. Checking first also keeps a failed run from leaving a half-created folder
// that blocks the next attempt.
import { unsupportedRuntimeMessage } from './runtime-support.ts';

const message = unsupportedRuntimeMessage(process.versions, process.execPath, 'create-bwf');
if (message) {
  process.stderr.write(`${message}\n`);
  // Decision: exitCode instead of exit() so the message is flushed when stderr is a pipe.
  process.exitCode = 1;
} else {
  await import('./main.ts');
}
