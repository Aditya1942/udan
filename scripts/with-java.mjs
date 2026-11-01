#!/usr/bin/env node
/**
 * Runs a command (e.g. `firebase emulators:exec …`) with a Java >= 21 on PATH,
 * which the Firebase emulators require. Uses, in order: JAVA_HOME, `java` on PATH,
 * macOS `java_home -v 21+`, then Homebrew's keg-only openjdk. Fails with a clear message otherwise.
 *
 * Usage: node scripts/with-java.mjs <command> [...args]
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

const MIN_JAVA = 21;

function javaMajor(javaBin) {
  // `java -version` prints to stderr.
  const { stdout = '', stderr = '' } = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  return parseMajor(`${stderr}${stdout}`);
}

function parseMajor(text) {
  const match = /version "(\d+)(?:\.(\d+))?/.exec(text);
  if (!match) return 0;
  const major = Number(match[1]);
  return major === 1 ? Number(match[2]) : major; // "1.8" style
}

/** Candidate bin directories holding a `java` executable. */
function candidates() {
  const dirs = [];
  if (process.env.JAVA_HOME) dirs.push(join(process.env.JAVA_HOME, 'bin'));
  dirs.push(null); // whatever `java` resolves to on PATH
  if (process.platform === 'darwin') {
    try {
      const home = execFileSync('/usr/libexec/java_home', ['-v', `${MIN_JAVA}+`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (home) dirs.push(join(home, 'bin'));
    } catch {
      /* none registered */
    }
    dirs.push('/opt/homebrew/opt/openjdk/bin', '/usr/local/opt/openjdk/bin');
    for (const v of [26, 25, 24, 23, 22, 21]) {
      dirs.push(`/opt/homebrew/opt/openjdk@${v}/bin`, `/usr/local/opt/openjdk@${v}/bin`);
    }
  }
  return dirs;
}

function findJavaBinDir() {
  for (const dir of candidates()) {
    const bin = dir ? join(dir, 'java') : 'java';
    if (dir && !existsSync(bin)) continue;
    if (javaMajor(bin) >= MIN_JAVA) return dir ?? '';
  }
  return undefined;
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/with-java.mjs <command> [...args]');
  process.exit(2);
}

const binDir = findJavaBinDir();
if (binDir === undefined) {
  console.error(
    `The Firebase emulators need Java ${MIN_JAVA} or newer. Install a JDK (e.g. \`brew install openjdk\`) ` +
      'and put it on PATH or set JAVA_HOME.',
  );
  process.exit(1);
}

const env = { ...process.env };
if (binDir) env.PATH = `${binDir}${delimiter}${env.PATH ?? ''}`;

const child = spawn(command, args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
