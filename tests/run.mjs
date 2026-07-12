/**
 * Test runner: boots the Vite dev server, runs every suite against it, tears it down.
 *
 *   npm test
 *
 * The e2e suites drive the app in your locally installed Microsoft Edge via
 * playwright-core, so there is no browser download. They seed a fake session into
 * localStorage and point it at a dead API — several of them deliberately assert on
 * the failure path (e.g. that a failed refresh still releases the spinner).
 */
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PORT = 1420
const ORIGIN = `http://127.0.0.1:${PORT}/`

// `npx` needs a shell on Windows; node.exe must NOT get one, or its path
// ("C:\Program Files\nodejs\node.exe") gets split on the space.
const runShell = (cmd, args, opts = {}) =>
  spawn(cmd, args, { shell: process.platform === 'win32', ...opts })
const runNode = (args, opts = {}) => spawn(process.execPath, args, opts)

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(ORIGIN)
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

const exitCode = (child) => new Promise((resolve) => child.on('close', resolve))

const server = runShell('npx', ['vite', '--port', String(PORT), '--host', '127.0.0.1'], {
  cwd: ROOT,
  stdio: 'ignore',
})

let failed = 0
try {
  if (!(await waitForServer())) {
    console.error(`Dev server never came up on ${ORIGIN}`)
    process.exit(1)
  }

  const suites = readdirSync(HERE)
    .filter((f) => /\.(mjs|cjs)$/.test(f) && f !== 'run.mjs')
    .sort()

  for (const suite of suites) {
    console.log(`\n──── ${suite} ${'─'.repeat(Math.max(0, 50 - suite.length))}`)
    const code = await exitCode(runNode([join(HERE, suite)], {
      cwd: ROOT,
      stdio: 'inherit',
    }))
    if (code !== 0) failed++
  }

  console.log(
    failed
      ? `\n✗ ${failed} of ${suites.length} suite(s) failed`
      : `\n✓ all ${suites.length} suites passed`
  )
} finally {
  server.kill()
}

process.exit(failed ? 1 : 0)
