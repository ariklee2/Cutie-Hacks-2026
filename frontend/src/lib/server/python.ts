/**
 * Runs the repo's Python scripts (filter/, features/) from the Next.js server,
 * exactly as from the command line: `python3 <script> <args>` with the repo
 * root as the working directory. SNAPSHOT_PYTHON picks the interpreter (one
 * with pandas, pyarrow and scikit-learn; default `python3`).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { REPO_ROOT } from './snapshotStore';

const exec = promisify(execFile);
const PYTHON = process.env.SNAPSHOT_PYTHON ?? 'python3';

/** Runs `script` with `args`; resolves with its stdout, rejects if it fails or times out. */
export async function runPython(script: string, args: string[], timeoutMs: number): Promise<string> {
  const { stdout } = await exec(PYTHON, [script, ...args], {
    cwd: REPO_ROOT,
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

/**
 * A one-line reason from a failed run: the last line the script printed
 * (our scripts exit with a short message; none ever prints a secret), else
 * the error's own message.
 */
export function pythonFailure(error: unknown): string {
  const err = error as { stderr?: string; stdout?: string; message?: string };
  return (err.stderr || err.stdout || '').trim().split('\n').pop() || err.message || 'Unknown error';
}
