import { normalizeHeader } from './headers.mjs'

export function collectHeaders(rows) {
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

export function normalizeKey(value) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).trim()
}

export function normalizeValue(value) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).replace(/\r\n/g, '\n')
}

export function buildLangMap(rows, keyHeader, langColumns) {
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
