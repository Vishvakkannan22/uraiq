#!/usr/bin/env node
/**
 * Supervisor for `wrangler dev`.
 *
 * Why this exists: wrangler's local dev proxy intermittently dies under real
 * browser load with `Error: Network connection lost.` thrown from its own
 * ProxyController — the stack contains no frame from this Worker, and the
 * handler timings in the log show requests completing in ~200ms while wrangler
 * reports 20s of wall clock. It is the dev proxy, not the code, and it takes
 * the whole process with it.
 *
 * Deployed Workers do not run this proxy, so it affects local development only.
 *
 * Rather than leave you staring at a dead port, this restarts it. Crashes are
 * printed rather than swallowed — if the loop starts spinning, that is a real
 * signal and the backoff below makes it obvious instead of hammering.
 *
 * Run wrangler directly (`npx wrangler dev`) when you want the raw behaviour.
 */
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const RESTART_DELAY_MS = 1_000
/** More than this many crashes inside the window means something is properly
 *  wrong, and restarting is just hiding it. */
const CRASH_LIMIT = 5
const CRASH_WINDOW_MS = 60_000

let crashes = []
let child = null
let stopping = false

function start() {
  child = spawn('npx', ['wrangler', 'dev', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  child.on('exit', (code, signal) => {
    if (stopping) return

    if (code === 0) {
      process.exit(0)
    }

    const now = Date.now()
    crashes = crashes.filter((t) => now - t < CRASH_WINDOW_MS)
    crashes.push(now)

    if (crashes.length > CRASH_LIMIT) {
      console.error(
        `\n[dev] wrangler exited ${crashes.length} times in ${CRASH_WINDOW_MS / 1000}s. ` +
          `Not restarting again — this is not the usual proxy flake.\n` +
          `[dev] Check the log path wrangler printed above for the real error.\n`
      )
      process.exit(1)
    }

    console.error(
      `\n[dev] wrangler exited (${signal ?? `code ${code}`}). ` +
        `This is the dev-proxy crash, not your Worker — restarting in ${RESTART_DELAY_MS}ms.\n`
    )
    setTimeout(start, RESTART_DELAY_MS)
  })
}

/* Forward the signal so Ctrl+C stops both, not just the supervisor. */
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true
    child?.kill(signal)
    process.exit(0)
  })
}

start()
