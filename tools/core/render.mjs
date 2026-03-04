export function renderContent(format, data, tsAsConst) {
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
