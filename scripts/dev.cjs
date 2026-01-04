const { spawn } = require('node:child_process')

function run(label, args) {
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: process.env
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`)
      return
    }
    if (code && code !== 0) {
      console.log(`[${label}] exited with code ${code}`)
    }
  })

  return child
}

const backend = run('backend', ['--prefix', 'backend', 'run', 'dev'])
const frontend = run('frontend', ['--prefix', 'frontend', 'run', 'dev'])

function shutdown(code) {
  try {
    backend.kill('SIGINT')
  } catch {}
  try {
    frontend.kill('SIGINT')
  } catch {}
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

backend.on('exit', (code) => {
  // If backend stops, stop everything.
  shutdown(typeof code === 'number' ? code : 1)
})

frontend.on('exit', (code) => {
  shutdown(typeof code === 'number' ? code : 1)
})
