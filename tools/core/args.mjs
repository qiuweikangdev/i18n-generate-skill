import { SUPPORTED_FORMATS } from './constants.mjs'

export function parseCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseArgs(argv) {
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
