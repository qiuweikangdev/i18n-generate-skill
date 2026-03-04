import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

async function readRowsWithXlsx(excelPath, preferredSheet) {
  const xlsxModule = await import('xlsx')
  const xlsx = xlsxModule.default ?? xlsxModule
  const workbook = xlsx.readFile(excelPath)

  if (!workbook.SheetNames.length) {
    throw new Error(`Workbook has no sheets: ${excelPath}`)
  }

  let activeSheet = preferredSheet
  if (activeSheet && !workbook.Sheets[activeSheet]) {
    console.warn(`[warn] Sheet "${activeSheet}" not found, fallback to "${workbook.SheetNames[0]}".`)
    activeSheet = workbook.SheetNames[0]
  }
  if (!activeSheet) {
    activeSheet = workbook.SheetNames[0]
  }

  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[activeSheet], { defval: '' })
  return { rows, sheetName: activeSheet, reader: 'xlsx' }
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr ?? '').trim()
    throw new Error(stderr || `${command} exited with code ${result.status}`)
  }
}

function runXlsxCli(excelPath, preferredSheet, outputPath) {
  const command = 'npx'
  const baseArgs = ['-y', 'xlsx-cli', '--json', '--output', outputPath]

  if (preferredSheet) {
    try {
      runCommand(command, [...baseArgs, '--sheet', preferredSheet, excelPath])
      return preferredSheet
    } catch {
      console.warn(`[warn] Sheet "${preferredSheet}" unavailable in xlsx-cli, fallback to first sheet.`)
    }
  }

  runCommand(command, [...baseArgs, excelPath])

  return preferredSheet || 'first-sheet'
}

async function readRowsWithXlsxCli(excelPath, preferredSheet) {
  const tempPath = path.join(os.tmpdir(), `i18n-sheet-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)

  try {
    const usedSheet = runXlsxCli(excelPath, preferredSheet, tempPath)
    const raw = await fs.readFile(tempPath, 'utf8')
    const rows = raw.trim() ? JSON.parse(raw) : []
    return { rows, sheetName: usedSheet, reader: 'xlsx-cli' }
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {})
  }
}

function isXlsxModuleMissing(error) {
  if (!error || typeof error !== 'object') {
    return false
  }
  const message = String(error.message ?? '')
  return error.code === 'ERR_MODULE_NOT_FOUND' && message.includes("'xlsx'")
}

export async function readRows(excelPath, preferredSheet) {
  try {
    return await readRowsWithXlsx(excelPath, preferredSheet)
  } catch (error) {
    if (!isXlsxModuleMissing(error)) {
      throw error
    }
    console.warn('[warn] Package "xlsx" not found, using "npx xlsx-cli" fallback.')
    return readRowsWithXlsxCli(excelPath, preferredSheet)
  }
}
