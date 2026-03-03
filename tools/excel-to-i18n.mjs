#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const SUPPORTED_FORMATS = new Set(['js', 'ts', 'json'])
const LANGUAGE_CODES = new Set([
  'sc',
  'tc',
  'en',
  'ja',
  'ko',
  'th',
  'id',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'ar',
  'tr',
  'ru',
  'vi',
])

const HEADER_ALIASES = new Map(
  [
    ['key', 'key'],
    ['i18n key', 'key'],
    ['i18n_key', 'key'],
    ['english', 'en'],
    ['英文', 'en'],
    ['英语', 'en'],
    ['日本語', 'ja'],
    ['日语', 'ja'],
    ['日文', 'ja'],
    ['한국어', 'ko'],
    ['韩语', 'ko'],
    ['韓語', 'ko'],
    ['ไทย', 'th'],
    ['泰语', 'th'],
    ['泰文', 'th'],
    ['bahasa indonesia', 'id'],
    ['印尼语', 'id'],
    ['印尼文', 'id'],
    ['espanol', 'es'],
    ['español', 'es'],
    ['西班牙语', 'es'],
    ['西班牙文', 'es'],
    ['francais', 'fr'],
    ['français', 'fr'],
    ['法语', 'fr'],
    ['法文', 'fr'],
    ['deutsch', 'de'],
    ['德语', 'de'],
    ['德文', 'de'],
    ['português', 'pt'],
    ['portugues', 'pt'],
    ['葡萄牙语', 'pt'],
    ['葡萄牙文', 'pt'],
    ['italiano', 'it'],
    ['意大利语', 'it'],
    ['意大利文', 'it'],
    ['العربية', 'ar'],
    ['阿拉伯语', 'ar'],
    ['阿拉伯文', 'ar'],
    ['türkçe', 'tr'],
    ['turkce', 'tr'],
    ['土耳其语', 'tr'],
    ['土耳其文', 'tr'],
    ['русский', 'ru'],
    ['俄语', 'ru'],
    ['俄文', 'ru'],
    ['繁體中文', 'tc'],
    ['繁体中文', 'tc'],
    ['简体中文', 'sc'],
    ['簡體中文', 'sc'],
    ['越南语', 'vi'],
    ['越南文', 'vi'],
    ['tiếng việt', 'vi'],
  ].map(([header, code]) => [header.toLowerCase(), code]),
)

function printHelp() {
  console.log(`
Excel to i18n generator

Usage:
  node tools/excel-to-i18n.mjs --excel <file.xlsx> --out <output-dir> [options]

Required:
  --excel, -e      Excel file path
  --out, -o        Output directory

Optional:
  --sheet, -s      Sheet name (default: i18n)
  --formats, -f    Output formats, comma-separated (default: ts)
  --langs, -l      Language list, comma-separated (auto-detect if omitted)
  --key, -k        Key column name (default: key)
  --ts-as-const    Use 'as const' in ts output
  --help, -h       Show this message

Examples:
  node tools/excel-to-i18n.mjs -e ./i18n.xlsx -o ./i18n
  node tools/excel-to-i18n.mjs -e ./i18n.xlsx -o ./src/locales -f ts,json -l sc,en,ja
`)
}

function parseCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseArgs(argv) {
  const options = {
    excel: '',
    out: '',
    sheet: 'i18n',
    formats: ['ts'],
    langs: [],
    key: 'key',
    tsAsConst: false,
    help: false,
  }

  const readValue = (name, currentIndex) => {
    const value = argv[currentIndex + 1]
    if (!value || value.startsWith('-')) {
      throw new Error(`Missing value for ${name}`)
    }
    return value
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--ts-as-const') {
      options.tsAsConst = true
      continue
    }

    if (arg === '--excel' || arg === '-e') {
      options.excel = readValue(arg, index)
      index += 1
      continue
    }

    if (arg === '--out' || arg === '-o') {
      options.out = readValue(arg, index)
      index += 1
      continue
    }

    if (arg === '--sheet' || arg === '-s') {
      options.sheet = readValue(arg, index)
      index += 1
      continue
    }

    if (arg === '--formats' || arg === '-f') {
      options.formats = parseCsv(readValue(arg, index)).map((item) => item.toLowerCase())
      index += 1
      continue
    }

    if (arg === '--langs' || arg === '-l') {
      options.langs = parseCsv(readValue(arg, index)).map((item) => item.toLowerCase())
      index += 1
      continue
    }

    if (arg === '--key' || arg === '-k') {
      options.key = readValue(arg, index)
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (options.help) {
    return options
  }

  if (!options.excel) {
    throw new Error('Missing required argument: --excel')
  }

  if (!options.out) {
    throw new Error('Missing required argument: --out')
  }

  const uniqueFormats = Array.from(new Set(options.formats))
  for (const format of uniqueFormats) {
    if (!SUPPORTED_FORMATS.has(format)) {
      throw new Error(`Unsupported format: ${format}. Supported: js, ts, json`)
    }
  }
  options.formats = uniqueFormats

  options.langs = Array.from(new Set(options.langs))

  return options
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function resolveHeaderCode(header) {
  const normalized = normalizeHeader(header)
  if (!normalized) {
    return null
  }

  const lower = normalized.toLowerCase()
  if (LANGUAGE_CODES.has(lower)) {
    return lower
  }

  const directAlias = HEADER_ALIASES.get(lower)
  if (directAlias) {
    return directAlias
  }

  const noParen = lower.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  if (LANGUAGE_CODES.has(noParen)) {
    return noParen
  }

  return HEADER_ALIASES.get(noParen) ?? null
}

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

async function readRows(excelPath, preferredSheet) {
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

function collectHeaders(rows) {
  const headers = []
  const seen = new Set()

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue
    }
    for (const header of Object.keys(row)) {
      const normalized = normalizeHeader(header)
      if (!normalized || seen.has(header)) {
        continue
      }
      seen.add(header)
      headers.push(header)
    }
  }

  return headers
}

function resolveKeyHeader(headers, keyOption) {
  const wanted = normalizeHeader(keyOption).toLowerCase()

  const byAlias = headers.find((header) => resolveHeaderCode(header) === 'key')
  if (byAlias) {
    return byAlias
  }

  const byExact = headers.find((header) => normalizeHeader(header).toLowerCase() === wanted)
  if (byExact) {
    return byExact
  }

  return headers[0] ?? ''
}

function resolveLangColumns(headers, keyHeader, requestedLangs) {
  const langColumns = []
  const seenCodes = new Set()

  if (requestedLangs.length) {
    for (const rawLang of requestedLangs) {
      const requested = rawLang.toLowerCase()
      let matchedHeader = headers.find((header) => resolveHeaderCode(header) === requested)
      if (!matchedHeader) {
        matchedHeader = headers.find((header) => normalizeHeader(header).toLowerCase() === requested)
      }
      if (!matchedHeader) {
        console.warn(`[warn] Language "${rawLang}" not found in headers, skipped.`)
        continue
      }

      const code = resolveHeaderCode(matchedHeader) ?? requested
      if (code === 'key' || matchedHeader === keyHeader || seenCodes.has(code)) {
        continue
      }
      seenCodes.add(code)
      langColumns.push({ code, header: matchedHeader })
    }

    return langColumns
  }

  for (const header of headers) {
    if (header === keyHeader) {
      continue
    }

    const code = resolveHeaderCode(header)
    if (!code || code === 'key' || seenCodes.has(code)) {
      continue
    }

    seenCodes.add(code)
    langColumns.push({ code, header })
  }

  if (langColumns.length) {
    return langColumns
  }

  for (const header of headers) {
    if (header === keyHeader) {
      continue
    }

    const code = normalizeHeader(header).toLowerCase().replace(/\s+/g, '_')
    if (!code || seenCodes.has(code)) {
      continue
    }

    seenCodes.add(code)
    langColumns.push({ code, header })
  }

  return langColumns
}

function normalizeKey(value) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).trim()
}

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).replace(/\r\n/g, '\n')
}

function buildLangMap(rows, keyHeader, langColumns) {
  const langMap = {}

  for (const { code } of langColumns) {
    langMap[code] = {}
  }

  for (const row of rows) {
    const key = normalizeKey(row[keyHeader])
    if (!key) {
      continue
    }

    for (const { code, header } of langColumns) {
      const value = normalizeValue(row[header])
      if (value === '') {
        continue
      }
      langMap[code][key] = value
    }
  }

  return langMap
}

function renderContent(format, data, tsAsConst) {
  const body = JSON.stringify(data, null, 2)

  if (format === 'json') {
    return `${body}\n`
  }

  if (format === 'js') {
    return `export default ${body}\n`
  }

  if (format === 'ts') {
    if (tsAsConst) {
      return `const data = ${body} as const\n\nexport default data\n`
    }
    return `export default ${body}\n`
  }

  throw new Error(`Unsupported format: ${format}`)
}

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath)
  } catch {
    throw new Error(`Excel file not found: ${filePath}`)
  }
}

async function main() {
  const options = parseArgs(process.argv)

  if (options.help) {
    printHelp()
    return
  }

  const excelPath = path.resolve(process.cwd(), options.excel)
  const outputDir = path.resolve(process.cwd(), options.out)

  await ensureFileExists(excelPath)

  const { rows, sheetName, reader } = await readRows(excelPath, options.sheet)
  if (!rows.length) {
    throw new Error(`No data rows found in sheet "${sheetName}".`)
  }

  const headers = collectHeaders(rows)
  if (!headers.length) {
    throw new Error(`No headers found in sheet "${sheetName}".`)
  }

  const keyHeader = resolveKeyHeader(headers, options.key)
  if (!keyHeader) {
    throw new Error('Unable to resolve key column.')
  }

  const langColumns = resolveLangColumns(headers, keyHeader, options.langs)
  if (!langColumns.length) {
    throw new Error('No language columns found. Check your header names or --langs setting.')
  }

  const langMap = buildLangMap(rows, keyHeader, langColumns)

  await fs.mkdir(outputDir, { recursive: true })

  const generatedFiles = []
  for (const { code } of langColumns) {
    for (const format of options.formats) {
      const filePath = path.join(outputDir, `${code}.${format}`)
      const content = renderContent(format, langMap[code], options.tsAsConst)
      await fs.writeFile(filePath, content, 'utf8')
      generatedFiles.push(filePath)
    }
  }

  console.log(`[done] Reader: ${reader}`)
  console.log(`[done] Sheet: ${sheetName}`)
  console.log(`[done] Key column: ${keyHeader}`)
  console.log(`[done] Languages: ${langColumns.map((item) => item.code).join(', ')}`)
  console.log(`[done] Generated ${generatedFiles.length} files in ${outputDir}`)

  for (const { code } of langColumns) {
    const keyCount = Object.keys(langMap[code]).length
    console.log(`  - ${code}: ${keyCount} keys`)
  }
}

main().catch((error) => {
  console.error(`[error] ${error.message}`)
  process.exit(1)
})
