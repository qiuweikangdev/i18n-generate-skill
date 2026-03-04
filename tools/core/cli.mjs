import process from 'node:process'

import { parseArgs } from './args.mjs'
import { generateI18nFiles } from './generator.mjs'

export function printHelp() {
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

function printResult(result) {
  console.log(`[done] Reader: ${result.reader}`)
  console.log(`[done] Sheet: ${result.sheetName}`)
  console.log(`[done] Key column: ${result.keyHeader}`)
  console.log(`[done] Languages: ${result.langColumns.map((item) => item.code).join(', ')}`)
  console.log(`[done] Generated ${result.generatedFiles.length} files in ${result.outputDir}`)

  for (const { code } of result.langColumns) {
    const keyCount = Object.keys(result.langMap[code]).length
    console.log(`  - ${code}: ${keyCount} keys`)
  }
}

export async function runCli(argv = process.argv) {
  const options = parseArgs(argv)

  if (options.help) {
    printHelp()
    return
  }

  const result = await generateI18nFiles(options)
  printResult(result)
}
