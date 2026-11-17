import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vite-plus/test';

// This repository is Product: it takes an app as input and doesn't know which app it is. The app we build on it
// is one of those apps, so its name has no place in product code, tests, docs or package manifests. The labels
// and the reasons are in the labels doc in that app's repository.
//
// The name is built from two parts so that this file passes its own check.
const appName = ['ded', 'worc'].join('');

// A deliberate mention goes here with its reason. A row that matches no file fails, so the list stays current.
const allowed: Array<{ file: string; reason: string }> = [
  { file: 'AGENTS.md', reason: 'Explains the two labels to agents, and one of them carries the name.' },
];

function filesThatNameTheApp(): Array<string> {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  try {
    // -I skips binary files, -i ignores case, -l lists file names. Submodules aren't searched.
    return execFileSync('git', ['grep', '-Iil', appName], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch (error) {
    // git grep exits with 1 when nothing matches.
    if ((error as { status?: number }).status === 1) return [];
    throw error;
  }
}

describe('product code stays free of app-specific names', () => {
  const found = filesThatNameTheApp();

  it('names no specific app outside the allowed list', () => {
    const allowedFiles = new Set(allowed.map((row) => row.file));
    expect(found.filter((file) => !allowedFiles.has(file))).toEqual([]);
  });

  it('has no allowed row that matches nothing', () => {
    expect(allowed.filter((row) => !found.includes(row.file))).toEqual([]);
  });
});
