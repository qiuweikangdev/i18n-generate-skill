import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { resolveKeyHeader, resolveLangColumns } from './headers.mjs'
import { readRows } from './readers.mjs'
import { renderContent } from './render.mjs'
import { buildLangMap, collectHeaders } from './transform.mjs'

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath)
  } catch {
    throw new Error(`Excel file not found: ${filePath}`)
  }
}

export async function generateI18nFiles(options) {
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

  return {
    reader,
    sheetName,
    keyHeader,
    langColumns,
    generatedFiles,
    outputDir,
    langMap,
  }
}
