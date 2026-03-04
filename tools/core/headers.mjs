import { HEADER_ALIASES, LANGUAGE_CODES } from './constants.mjs'

export function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function resolveHeaderCode(header) {
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

export function resolveKeyHeader(headers, keyOption) {
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

export function resolveLangColumns(headers, keyHeader, requestedLangs) {
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
