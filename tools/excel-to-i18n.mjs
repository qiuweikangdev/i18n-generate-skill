#!/usr/bin/env node

import process from 'node:process'

import { runCli } from './core/cli.mjs'

runCli().catch((error) => {
  console.error(`[error] ${error.message}`)
  process.exit(1)
})
