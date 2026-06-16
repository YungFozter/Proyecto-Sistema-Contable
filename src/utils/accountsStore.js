const ACCOUNTS_STORAGE_KEY = 'proaccount-accounts'

function readJsonSafe(rawValue, fallbackValue) {
  if (!rawValue) {
    return fallbackValue
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return parsedValue ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

function readRawAccounts() {
  if (typeof window === 'undefined') {
    return []
  }

  const rawAccounts = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
  const parsedAccounts = readJsonSafe(rawAccounts, [])

  return Array.isArray(parsedAccounts)
    ? parsedAccounts.filter((account) => account && typeof account === 'object')
    : []
}

function writeRawAccounts(accounts) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

export function normalizeCode(code) {
  return normalizeText(code).replace(/\s+/g, '')
}

export function parseCodeSegments(code) {
  const normalizedCode = normalizeCode(code)

  if (!normalizedCode) {
    return []
  }

  return normalizedCode.split('.').filter(Boolean)
}

export function getAccountLevel(code) {
  return parseCodeSegments(code).length || null
}

export function getParentCode(code) {
  const segments = parseCodeSegments(code)

  if (segments.length <= 1) {
    return null
  }

  return segments.slice(0, -1).join('.')
}

export function isValidAccountCode(code) {
  const segments = parseCodeSegments(code)

  if (segments.length < 1 || segments.length > 5) {
    return false
  }

  return segments.every((segment) => /^\d+$/.test(segment) && Number(segment) > 0)
}

export function parseMoney(value) {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN
  }

  let text = String(value).trim()

  if (!text) return 0

  // detect parentheses as negative
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1).trim()
  }

  // remove currency symbols and letters, keep digits, dots, commas and minus
  text = text.replace(/[^0-9.,-]/g, '')

  if (!text) return 0

  const hasComma = text.indexOf(',') !== -1
  const hasDot = text.indexOf('.') !== -1

  if (hasComma && hasDot) {
    // determine decimal by last separator
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      // comma is decimal
      text = text.replace(/\./g, '').replace(/,/g, '.')
    } else {
      // dot is decimal
      text = text.replace(/,/g, '')
    }
  } else if (hasComma && !hasDot) {
    // assume comma is decimal if fraction length <=2, else remove thousands commas
    const parts = text.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      text = parts.join('.')
    } else {
      text = text.replace(/,/g, '')
    }
  } else {
    // only dot or only digits: remove any stray commas
    text = text.replace(/,/g, '')
  }

  const num = Number(text)
  return Number.isFinite(num) ? (negative ? -num : num) : Number.NaN
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function formatMoney(value) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function normalizeAccount(account) {
  const code = normalizeCode(account.code)
  const name = normalizeText(account.name)
  // Usar level y type explícitos si existen, si no calcular
  const level = account.level !== undefined ? account.level : getAccountLevel(code)
  const parentCode = account.parentCode !== undefined ? account.parentCode : getParentCode(code)
  const type = account.type !== undefined ? account.type : (level !== null && level <= 3 ? 'group' : 'detail')

  return {
    ...account,
    code,
    name,
    level,
    parentCode,
    type,
  }
}

function buildChildrenMap(accounts) {
  const childrenMap = new Map()

  for (const account of accounts) {
    const parentKey = normalizeCode(account.parentCode)

    if (!parentKey) {
      continue
    }

    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, [])
    }

    childrenMap.get(parentKey).push(account)
  }

  return childrenMap
}

function sortAccountsByCode(accounts) {
  return [...accounts].sort((leftAccount, rightAccount) => {
    const leftSegments = parseCodeSegments(leftAccount.code).map(Number)
    const rightSegments = parseCodeSegments(rightAccount.code).map(Number)
    const maxLength = Math.max(leftSegments.length, rightSegments.length)

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = leftSegments[index] ?? -1
      const rightValue = rightSegments[index] ?? -1

      if (leftValue !== rightValue) {
        return leftValue - rightValue
      }
    }

    return leftAccount.code.localeCompare(rightAccount.code)
  })
}

function calculateTree(accounts) {
  const normalizedAccounts = sortAccountsByCode(accounts.map(normalizeAccount))
  const childrenMap = buildChildrenMap(normalizedAccounts)
  const accountMap = new Map(normalizedAccounts.map((account) => [account.code, account]))
  const memo = new Map()

  const getComputedTotals = (accountCode) => {
    if (memo.has(accountCode)) {
      return memo.get(accountCode)
    }

    const account = accountMap.get(accountCode)

    if (!account) {
      const emptyTotals = { management1: 0, management2: 0 }
      memo.set(accountCode, emptyTotals)
      return emptyTotals
    }

    const children = childrenMap.get(accountCode) ?? []

    if (account.type === 'detail' || children.length === 0) {
      const detailTotals = {
        management1: roundMoney(account.manualManagement1 ?? 0),
        management2: roundMoney(account.manualManagement2 ?? 0),
      }

      memo.set(accountCode, detailTotals)
      return detailTotals
    }

    const computedTotals = children.reduce(
      (runningTotals, childAccount) => {
        const childTotals = getComputedTotals(childAccount.code)

        return {
          management1: roundMoney(runningTotals.management1 + childTotals.management1),
          management2: roundMoney(runningTotals.management2 + childTotals.management2),
        }
      },
      { management1: 0, management2: 0 }
    )

    memo.set(accountCode, computedTotals)
    return computedTotals
  }

  return normalizedAccounts.map((account) => {
    const totals = getComputedTotals(account.code)

    return {
      id: account.id ?? account.code,
      code: account.code,
      name: account.name,
      level: account.level,
      type: account.type,
      parentCode: account.parentCode,
      manualManagement1: roundMoney(account.manualManagement1 ?? 0),
      manualManagement2: roundMoney(account.manualManagement2 ?? 0),
      management1: totals.management1,
      management2: totals.management2,
      variation: roundMoney(totals.management2 - totals.management1),
      createdAt: account.createdAt ?? null,
      updatedAt: account.updatedAt ?? null,
    }
  })
}

export function readAccounts() {
  return calculateTree(readRawAccounts())
}

function formatCsvDecimal(value) {
  return (Number(value) || 0).toFixed(2).replace('.', ',')
}

function escapeCsvValue(value) {
  const text = String(value ?? '')

  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export function exportAccountsToCsvText(accounts = readAccounts()) {
  const rows = [
    [
      'codigo',
      'nombre',
      'nivel',
      'tipo',
      'codigoPadre',
      'gestionManual1',
      'gestionManual2',
      'gestion1',
      'gestion2',
      'variacion',
      'creadoEn',
      'actualizadoEn',
    ].join(';'),
  ]

  for (const account of sortAccountsByCode(accounts)) {
    const values = [
      account.code,
      account.name,
      account.level ?? '',
      account.type ?? '',
      account.parentCode ?? '',
      formatCsvDecimal(account.manualManagement1),
      formatCsvDecimal(account.manualManagement2),
      formatCsvDecimal(account.management1),
      formatCsvDecimal(account.management2),
      formatCsvDecimal(account.variation),
      account.createdAt ?? '',
      account.updatedAt ?? '',
    ].map(escapeCsvValue)

    rows.push(values.join(';'))
  }

  return rows.join('\n')
}

export function findAccountByCode(code) {
  const normalizedCode = normalizeCode(code)

  if (!normalizedCode) {
    return null
  }

  return readAccounts().find((account) => account.code === normalizedCode) ?? null
}

function validateAccountInput(accountPayload, existingAccounts, currentCode = null) {
  const errors = []
  const code = normalizeCode(accountPayload.code)
  const name = normalizeText(accountPayload.name)
  const level = accountPayload.level !== undefined ? accountPayload.level : getAccountLevel(code)
  const type = accountPayload.type !== undefined ? accountPayload.type : (level && level <= 3 ? 'group' : 'detail')
  const manualManagement1 = parseMoney(accountPayload.management1)
  const manualManagement2 = parseMoney(accountPayload.management2)
  const normalizedCurrentCode = normalizeCode(currentCode)
  const allowGroupManual = !!accountPayload._allowGroupManual

  if (!code) {
    errors.push('El código es obligatorio.')
  } else if (!isValidAccountCode(code)) {
    errors.push('El código debe tener entre 1 y 5 niveles, separados por puntos.')
  }

  if (!name) {
    errors.push('El nombre de la cuenta es obligatorio.')
  }

  // Usar parentCode del payload si existe, si no calcular
  const parentCode = accountPayload.parentCode !== undefined ? accountPayload.parentCode : getParentCode(code)

  if (level && level > 1 && parentCode) {
    const parentExists = existingAccounts.some((account) => account.code === parentCode)
    if (!parentExists) {
      errors.push(`No existe la cuenta padre ${parentCode} para crear ${code}.`)
    }
  } else if (level && level > 1 && !parentCode && level <= 3) {
    // Solo para niveles 2 o 3 que no tienen padre explícito
    errors.push(`La cuenta ${code} necesita un padre válido.`)
  }
  // Para niveles >=4, no exigimos padre (son cuentas de detalle)

  const duplicateExists = existingAccounts.some((account) => account.code === code && account.code !== normalizedCurrentCode)

  if (duplicateExists) {
    errors.push(`Ya existe una cuenta con el código ${code}.`)
  }

  if (level && level <= 3) {
    if (!allowGroupManual && (roundMoney(manualManagement1) !== 0 || roundMoney(manualManagement2) !== 0)) {
      errors.push('Las cuentas de agrupación no deben recibir saldos manuales. Usa 0.00 y deja que el sistema calcule las sumatorias.')
    }
  } else if (level && level >= 4) {
    if (!Number.isFinite(manualManagement1) || !Number.isFinite(manualManagement2)) {
      errors.push('Las gestiones deben ser valores numéricos válidos.')
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      code,
      name,
      level,
      parentCode: parentCode,
      type: level && level <= 3 ? 'group' : 'detail',
      manualManagement1: level && level <= 3 ? 0 : roundMoney(manualManagement1),
      manualManagement2: level && level <= 3 ? 0 : roundMoney(manualManagement2),
    },
  }
}

export function saveAccount(accountPayload) {
  const existingAccounts = readRawAccounts().map(normalizeAccount)
  const currentCode = normalizeCode(accountPayload?.currentCode)

  // Auto-create missing parent accounts up the chain before validation
  const normalizedRequestedCode = normalizeCode(accountPayload?.code)
  const parentsToCreate = []

  if (normalizedRequestedCode) {
    let parent = getParentCode(normalizedRequestedCode)

    while (parent) {
      const parentExists = existingAccounts.some((acc) => acc.code === parent)

      if (!parentExists && !parentsToCreate.includes(parent)) {
        parentsToCreate.push(parent)
      }

      parent = getParentCode(parent)
    }
  }

  const createdParents = []

  // Create missing parents from the top-most down so hierarchy is correct
  if (parentsToCreate.length) {
    parentsToCreate.reverse().forEach((parentCode) => {
      const level = getAccountLevel(parentCode)
      const parentAccount = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        code: parentCode,
        name: `AUTO: ${parentCode}`,
        level,
        parentCode: getParentCode(parentCode),
        type: level !== null && level <= 3 ? 'group' : 'detail',
        manualManagement1: 0,
        manualManagement2: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      existingAccounts.push(parentAccount)
      createdParents.push(parentCode)
    })
  }

  const validation = validateAccountInput(accountPayload, existingAccounts, currentCode)

  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      account: null,
    }
  }

  const accounts = [...existingAccounts]
  const nextAccount = {
    id: existingAccounts.find((account) => account.code === validation.normalized.code)?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    code: validation.normalized.code,
    name: validation.normalized.name,
    level: validation.normalized.level,
    parentCode: validation.normalized.parentCode,
    type: validation.normalized.type,
    manualManagement1: validation.normalized.manualManagement1,
    manualManagement2: validation.normalized.manualManagement2,
    createdAt: existingAccounts.find((account) => account.code === validation.normalized.code)?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const existingIndex = accounts.findIndex((account) => account.code === validation.normalized.code)

  if (existingIndex >= 0) {
    accounts[existingIndex] = nextAccount
  } else {
    accounts.push(nextAccount)
  }

  const computedAccounts = calculateTree(accounts)
  writeRawAccounts(computedAccounts)

  return {
    ok: true,
    errors: [],
    account: computedAccounts.find((account) => account.code === validation.normalized.code) ?? null,
    autoCreated: createdParents,
  }
}

export function deleteAccount(code) {
  const normalizedCode = normalizeCode(code)

  if (!normalizedCode) {
    return {
      ok: false,
      errors: ['El código es obligatorio.'],
    }
  }

  const existingAccounts = readRawAccounts().map(normalizeAccount)
  const childrenExist = existingAccounts.some((account) => account.parentCode === normalizedCode)

  if (childrenExist) {
    return {
      ok: false,
      errors: ['No puedes eliminar una cuenta que tiene subcuentas.'],
    }
  }

  const nextAccounts = existingAccounts.filter((account) => account.code !== normalizedCode)
  const computedAccounts = calculateTree(nextAccounts)
  writeRawAccounts(computedAccounts)

  return {
    ok: true,
    errors: [],
  }
}

export function deleteAllAccounts() {
  writeRawAccounts([])

  return {
    ok: true,
    errors: [],
  }
}

function splitCsvLine(line, delimiter) {
  const cells = []
  let currentValue = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === delimiter && !inQuotes) {
      cells.push(currentValue)
      currentValue = ''
      continue
    }

    currentValue += character
  }

  cells.push(currentValue)
  return cells.map((cell) => cell.trim())
}

function makeUniqueHeaders(headers) {
  const used = new Map()
  return headers.map((header, index) => {
    const base = normalizeText(header) || `COLUMN_${index + 1}`
    const count = (used.get(base) || 0) + 1
    used.set(base, count)
    return count > 1 ? `${base}_${count}` : base
  })
}

export function parseCsvText(csvText) {
  const normalizedText = String(csvText ?? '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')

  if (!normalizedText) {
    return { headers: [], rows: [] }
  }

  // Don't trim the entire text to preserve empty lines for header discovery
  const rawLines = normalizedText.split('\n')
  // Try to detect delimiter from the first non-empty candidate line
  const firstNonEmpty = rawLines.find((l) => String(l).trim().length > 0) || ''
  const guessedDelimiter = firstNonEmpty.includes(';') && firstNonEmpty.split(';').length >= firstNonEmpty.split(',').length ? ';' : ','

  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0)

  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }

  // Find the header line index by looking for common header tokens (codigo, cuenta, nombre)
  const headerCandidates = ['codigodecuenta', 'codigo', 'cuenta', 'nombredelacuenta', 'nombre']

  let headerIndex = -1
  let headerDelimiter = guessedDelimiter

  // Choose the line + delimiter that yields the most header-like tokens
  let bestMatchCount = 0
  const otherDelimiter = guessedDelimiter === ',' ? ';' : ','

  for (let i = 0; i < lines.length; i += 1) {
    for (const delim of [guessedDelimiter, otherDelimiter]) {
      const cells = splitCsvLine(lines[i], delim)
      const normalizedCells = cells.map((c) => normalizeHeaderKey(c))
      let matchCount = 0
      for (const cell of normalizedCells) {
        if (headerCandidates.some((cand) => cell.includes(cand))) matchCount += 1
      }

      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount
        headerIndex = i
        headerDelimiter = delim
      }
    }
  }

  if (headerIndex === -1 || headerIndex >= lines.length - 1) {
    // No clear header found, fallback to original simple parse using first line
    const headers = makeUniqueHeaders(splitCsvLine(lines[0], guessedDelimiter).map((header) => header.trim()))
    const rows = lines.slice(1).map((line) => {
      const values = splitCsvLine(line, guessedDelimiter)
      const row = {}

      headers.forEach((header, index) => {
        row[header] = values[index] ?? ''
      })

      return row
    })

    return { headers, rows }
  }

  const headers = makeUniqueHeaders(splitCsvLine(lines[headerIndex], headerDelimiter).map((header) => header.trim()))

  const rows = lines.slice(headerIndex + 1).map((line) => {
    const values = splitCsvLine(line, headerDelimiter)
    const row = {}

    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })

    return row
  })

  return { headers, rows }
}

function normalizeHeaderKey(header) {
  return String(header ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function pickRowValue(row, candidates) {
  const normalizedRowEntries = Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value])

  for (const candidate of candidates) {
    const foundEntry = normalizedRowEntries.find(([key]) => key.includes(candidate))

    if (foundEntry) {
      return foundEntry[1]
    }
  }

  return ''
}

export function extractAccountCodesFromCsvText(csvText) {
  const parsed = parseCsvText(csvText)
  const rows = parsed && parsed.rows ? parsed.rows : []

  if (!rows.length) return []

  const codes = rows.map((row) => normalizeCode(pickRowValue(row, ['codigodecuenta', 'codigo', 'code']))).filter(Boolean)
  return Array.from(new Set(codes))
}

function rowToCells(row) {
  return Object.values(row).map((value) => String(value ?? ''))
}

function isYearToken(value) {
  return /^\d{4}$/.test(String(value ?? '').trim())
}

function looksLikeCode(value) {
  return /^\d+(\.\d+){0,4}$/.test(normalizeCode(value))
}

function normalizeNameKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function detectSectionKey(name) {
  const n = normalizeNameKey(name)

  if (n.includes('activo')) return 'activo'
  if (n.includes('pasivo')) return 'pasivo'
  if (n.includes('patrimonio') || n.includes('capital')) return 'patrimonio'
  if (n.includes('ingreso') || n.includes('venta')) return 'ingresos'
  if (n.includes('costo')) return 'costos'
  if (n.includes('gasto')) return 'gastos'
  if (n.includes('utilidad') || n.includes('resultado') || n.includes('impuesto')) return 'resultado'
  return 'otros'
}

function buildAutoCode(sectionOrder, sectionCounters, sectionKey) {
  if (!sectionOrder.has(sectionKey)) {
    sectionOrder.set(sectionKey, sectionOrder.size + 1)
    sectionCounters.set(sectionKey, 0)
  }

  const base = sectionOrder.get(sectionKey)
  const next = (sectionCounters.get(sectionKey) || 0) + 1
  sectionCounters.set(sectionKey, next)

  // Keep detail accounts at level 4 so balances can be loaded manually.
  return `${base}.1.1.${next}`
}

export function buildAccountsRowsFromFinancialRows(rows = []) {
  if (!Array.isArray(rows) || !rows.length) {
    return { rows: [], inferred: false }
  }

  const matrix = rows.map((row) => rowToCells(row))
  const maxCols = matrix.reduce((max, cells) => Math.max(max, cells.length), 0)

  if (!maxCols) {
    return { rows: [], inferred: false }
  }

  const yearHeaderIndex = matrix.findIndex((cells) => cells.filter((cell) => isYearToken(cell)).length >= 2)
  const yearColumns = yearHeaderIndex >= 0
    ? matrix[yearHeaderIndex]
      .map((cell, index) => (isYearToken(cell) ? index : -1))
      .filter((index) => index >= 0)
    : []

  const dataStart = yearHeaderIndex >= 0 ? yearHeaderIndex + 1 : 0

  // Detect probable code column by frequency of hierarchical code patterns.
  let codeColumn = -1
  let codeHitsBest = 0
  for (let column = 0; column < maxCols; column += 1) {
    let hits = 0
    for (let rowIndex = dataStart; rowIndex < matrix.length; rowIndex += 1) {
      const value = matrix[rowIndex]?.[column] ?? ''
      if (looksLikeCode(value)) hits += 1
    }
    if (hits > codeHitsBest) {
      codeHitsBest = hits
      codeColumn = column
    }
  }
  if (codeHitsBest < 3) codeColumn = -1

  // Detect probable name column by text density, preferring columns left of numeric year columns.
  let nameColumn = -1
  let nameHitsBest = 0
  const maxPreferredNameCol = yearColumns.length ? Math.max(0, yearColumns[0] - 1) : maxCols - 1

  for (let column = 0; column <= maxPreferredNameCol; column += 1) {
    if (column === codeColumn) continue
    let hits = 0
    for (let rowIndex = dataStart; rowIndex < matrix.length; rowIndex += 1) {
      const value = String(matrix[rowIndex]?.[column] ?? '').trim()
      const parsed = parseMoney(value)
      const hasDigits = /\d/.test(value)
      if (value && (!Number.isFinite(parsed) || !hasDigits)) hits += 1
    }
    if (hits > nameHitsBest) {
      nameHitsBest = hits
      nameColumn = column
    }
  }

  if (nameColumn === -1) {
    return { rows: [], inferred: false }
  }

  const numericColumns = yearColumns.length
    ? yearColumns
    : Array.from({ length: maxCols }, (_, column) => column).filter((column) => {
      let hits = 0
      for (let rowIndex = dataStart; rowIndex < matrix.length; rowIndex += 1) {
        const value = String(matrix[rowIndex]?.[column] ?? '').trim()
        const parsed = parseMoney(value)
        if (/\d/.test(value) && Number.isFinite(parsed)) hits += 1
      }
      return hits >= 2
    })

  const management1Column = numericColumns.length >= 2 ? numericColumns[numericColumns.length - 2] : -1
  const management2Column = numericColumns.length >= 1 ? numericColumns[numericColumns.length - 1] : -1

  const sectionOrder = new Map()
  const sectionCounters = new Map()
  const builtRows = []

  for (let rowIndex = dataStart; rowIndex < matrix.length; rowIndex += 1) {
    const cells = matrix[rowIndex]
    const rawName = String(cells?.[nameColumn] ?? '')
    const name = rawName.trim()

    if (!name) continue
    if (/^total\b/i.test(name)) continue

    // Skip pure metadata rows
    if (/empresa|gestion|exp\.?\s*en/i.test(normalizeNameKey(name)) && management2Column >= 0) {
      const maybeValue = String(cells?.[management2Column] ?? '').trim()
      if (!maybeValue) continue
    }

    const rawCode = codeColumn >= 0 ? String(cells?.[codeColumn] ?? '') : ''
    const normalizedCode = normalizeCode(rawCode)
    const hasValidCode = normalizedCode && isValidAccountCode(normalizedCode)
    const sectionKey = detectSectionKey(name)
    const autoCode = hasValidCode ? normalizedCode : buildAutoCode(sectionOrder, sectionCounters, sectionKey)

    const management1Value = management1Column >= 0 ? String(cells?.[management1Column] ?? '') : ''
    const management2Value = management2Column >= 0 ? String(cells?.[management2Column] ?? '') : ''

    builtRows.push({
      codigo: autoCode,
      nombre: name,
      gestion1: management1Value,
      gestion2: management2Value,
    })
  }

  return {
    rows: builtRows,
    inferred: codeColumn === -1,
  }
}

/**
 * Convierte códigos contables concatenados sin puntos al formato jerárquico.
 * Ejemplos:
 *   '101'        → '1.01'   (ya manejado por convertThreeDigitConcat)
 *   '10101'      → '1.01.01'
 *   '1010101'    → '1.01.01.01'
 *   '1010101001' → '1.01.01.01.001'
 * Solo actúa si el código no tiene puntos y tiene más de 3 dígitos.
 */
function convertConcatenatedCode(rawCode) {
  const code = String(rawCode ?? '').trim()

  // Ya tiene puntos o es un código simple de 1-2 dígitos → no convertir
  if (code.includes('.') || code.length <= 2) return code

  // Patrón boliviano estándar: 1 + grupos de 2 o 3 dígitos
  // Nivel 1: 1 dígito  → '1'
  // Nivel 2: 3 dígitos → '1' + '01'          → '1.01'   (pero se guarda como '1.1')
  // Nivel 3: 5 dígitos → '1' + '01' + '01'   → '1.1.1'
  // Nivel 4: 7 dígitos → '1.1.1.1'
  // Nivel 5: 10 dígitos→ '1.1.1.1.1'

  if (!/^\d+$/.test(code)) return code

  const len = code.length

  // 3 dígitos: 1-2 (ya lo maneja convertThreeDigitConcat, pero por si acaso)
  if (len === 3) {
    return `${Number(code[0])}.${Number(code.slice(1))}`
  }
  // 5 dígitos: 1-2-2
  if (len === 5) {
    return `${Number(code[0])}.${Number(code.slice(1, 3))}.${Number(code.slice(3, 5))}`
  }
  // 7 dígitos: 1-2-2-2
  if (len === 7) {
    return `${Number(code[0])}.${Number(code.slice(1, 3))}.${Number(code.slice(3, 5))}.${Number(code.slice(5, 7))}`
  }
  // 10 dígitos: 1-2-2-2-3
  if (len === 10) {
    return `${Number(code[0])}.${Number(code.slice(1, 3))}.${Number(code.slice(3, 5))}.${Number(code.slice(5, 7))}.${Number(code.slice(7, 10))}`
  }

  // Para otros largos, intentar dividir en segmentos de 1-2-2-2-3
  return code
}

export function importAccountsFromRows(rows, options = {}) {
  const onDuplicate = options.onDuplicate === 'update' ? 'update' : 'skip'
  const convertThreeDigitConcat = !!options.convertThreeDigitConcat

  if (!Array.isArray(rows) || !rows.length) {
    return {
      ok: false,
      imported: 0,
      errors: ['No hay filas válidas para importar.'],
    }
  }

  let importedCount = 0
  let updatedCount = 0
  const errors = []
  const autoCreatedSet = new Set()
  const skipped = []
  const updated = []

  for (const [index, row] of rows.entries()) {
    // Skip rows that don't contain a valid account code (e.g., footer totals)
    const rawCodeCandidate = pickRowValue(row, ['codigodecuenta', 'codigo', 'code', 'cuenta'])
    const normalizedCandidate = normalizeCode(rawCodeCandidate)

    if (!normalizedCandidate || !isValidAccountCode(normalizedCandidate)) {
      // skip rows like ",TOTAL ..." or empty lines
      continue
    }

    let codeValue = rawCodeCandidate

    // Convertir automáticamente códigos concatenados sin puntos (boliviano estándar)
    // Aplica a cualquier código de 3+ dígitos sin puntos: 101, 10101, 1010101, 1010101001
    if (normalizedCandidate && !normalizedCandidate.includes('.') && normalizedCandidate.length >= 3) {
      codeValue = convertConcatenatedCode(normalizedCandidate)
    } else if (convertThreeDigitConcat && /^[0-9]{3}$/.test(normalizedCandidate) && normalizedCandidate.indexOf('.') === -1) {
      const first = normalizedCandidate.slice(0, 1)
      const rest = normalizedCandidate.slice(1)
      codeValue = [String(Number(first)), String(Number(rest))].join('.')
    }

    const payload = {
      code: codeValue,
      name: pickRowValue(row, ['nombredelacuenta', 'nombrecuenta', 'nombre', 'cuenta']),
      management1: pickRowValue(row, ['gestion1', 'management1', 'anoanterior', 'añoanterior']),
      // Support files that use a single column labelled 'BOLIVIANOS' (or similar)
      management2: pickRowValue(row, ['gestion2', 'management2', 'anoactual', 'añoactual', 'bolivianos', 'boliviano', 'bolivia']),
    }

    const normalizedCode = normalizeCode(payload.code)

    const exists = normalizedCode && findAccountByCode(normalizedCode)

    if (exists && onDuplicate === 'skip') {
      skipped.push(normalizedCode)
      continue
    }

    const savePayload = (exists && onDuplicate === 'update')
      ? { ...payload, currentCode: normalizedCode, _allowGroupManual: true }
      : { ...payload, _allowGroupManual: true }

    const result = saveAccount(savePayload)

    if (!result.ok) {
      errors.push(`Fila ${index + 2}: ${result.errors.join(' ')}`)
      continue
    }

    // collect any auto-created parent codes reported by saveAccount
    if (Array.isArray(result.autoCreated) && result.autoCreated.length) {
      result.autoCreated.forEach((code) => autoCreatedSet.add(code))
    }

    if (exists && onDuplicate === 'update') {
      updatedCount += 1
      updated.push(normalizedCode)
    } else {
      importedCount += 1
    }
  }

  return {
    ok: errors.length === 0,
    imported: importedCount,
    updated: updatedCount,
    errors,
    autoCreated: Array.from(autoCreatedSet),
    skipped,
    updatedCodes: updated,
  }
}

export function importAccountsFromCsvText(csvText, options = {}) {
  const parsed = parseCsvText(csvText)
  const rows = parsed && parsed.rows ? parsed.rows : []
  return importAccountsFromRows(rows, options)
}

export async function parseXlsxBuffer(buffer) {
  // Attempt to parse XLSX buffer using 'xlsx' library if available.
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    // Convert to array of objects using header row detection
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    const headers = rows.length ? Object.keys(rows[0]) : []
    return { headers, rows }
  } catch (e) {
    return { headers: [], rows: [] }
  }
}

export function getAccountSummary(accounts = readAccounts()) {
  const totalAccounts = accounts.length
  const totalManagement1 = accounts.reduce((sum, account) => sum + (Number(account.management1) || 0), 0)
  const totalManagement2 = accounts.reduce((sum, account) => sum + (Number(account.management2) || 0), 0)
  const variationTotal = totalManagement2 - totalManagement1

  return {
    totalAccounts,
    totalManagement1,
    totalManagement2,
    variationTotal,
  }
}

function getRootAccountAmount(accounts, rootCode, periodKey) {
  const account = accounts.find((entry) => entry.level === 1 && entry.code === rootCode)

  return roundMoney(account?.[periodKey] ?? 0)
}

export function getFinancialStatements(accounts = readAccounts()) {
  const rootAccounts = accounts.filter((account) => account.level === 1)

  const buildPeriodBalance = (periodKey) => {
    const assets = getRootAccountAmount(rootAccounts, '1', periodKey)
    const liabilities = getRootAccountAmount(rootAccounts, '2', periodKey)
    const equity = getRootAccountAmount(rootAccounts, '3', periodKey)

    return {
      assets,
      liabilities,
      equity,
      liabilitiesAndEquity: roundMoney(liabilities + equity),
      difference: roundMoney(assets - (liabilities + equity)),
    }
  }

  const buildPeriodResults = (periodKey) => {
    const income = getRootAccountAmount(rootAccounts, '4', periodKey)
    const expenses = getRootAccountAmount(rootAccounts, '5', periodKey)

    return {
      income,
      expenses,
      result: roundMoney(income - expenses),
    }
  }

  return {
    balanceGeneral: {
      previous: buildPeriodBalance('management1'),
      current: buildPeriodBalance('management2'),
    },
    statementOfResults: {
      previous: buildPeriodResults('management1'),
      current: buildPeriodResults('management2'),
    },
    rootsFound: rootAccounts.map((account) => account.code),
  }
}

export function groupAccountsByParent(accounts = readAccounts()) {
  return accounts.reduce((groups, account) => {
    const parentKey = account.parentCode ?? '__root__'

    if (!groups[parentKey]) {
      groups[parentKey] = []
    }

    groups[parentKey].push(account)
    return groups
  }, {})
}

function normalizeAccountNameKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isBalanceGeneralAccount(account) {
  if (account.section === 'balance_general') {
    return true
  }

  const code = normalizeCode(account.code)
  if (/^[123](\.|$)/.test(code)) {
    return true
  }

  const name = normalizeAccountNameKey(account.name)
  return /activo|pasivo|patrimonio|capital|inventario|disponib|caja|banco/i.test(name)
}

function getAccountPeriodAmount(account, periodKey) {
  if (!account) {
    return 0
  }

  return roundMoney(Number(account[periodKey]) || 0)
}

function findLiquidityAccount(accounts, { exactCodes = [], codePrefixes = [], namePatterns = [] }) {
  const balanceAccounts = accounts.filter(isBalanceGeneralAccount)

  for (const code of exactCodes) {
    const normalizedCode = normalizeCode(code)
    const exactMatch = balanceAccounts.find((account) => account.code === normalizedCode)

    if (exactMatch) {
      return exactMatch
    }
  }

  for (const prefix of codePrefixes) {
    const normalizedPrefix = normalizeCode(prefix)
    const exactPrefixMatch = balanceAccounts.find((account) => account.code === normalizedPrefix)

    if (exactPrefixMatch) {
      return exactPrefixMatch
    }

    const prefixMatches = balanceAccounts
      .filter((account) => account.code.startsWith(`${normalizedPrefix}.`))
      .sort((leftAccount, rightAccount) => leftAccount.code.length - rightAccount.code.length)

    if (prefixMatches.length) {
      return prefixMatches[0]
    }
  }

  const nameMatches = balanceAccounts.filter((account) => {
    const normalizedName = normalizeAccountNameKey(account.name)
    return namePatterns.some((pattern) => pattern.test(normalizedName))
  })

  if (!nameMatches.length) {
    return null
  }

  nameMatches.sort((leftAccount, rightAccount) => {
    if (leftAccount.type === 'group' && rightAccount.type !== 'group') {
      return -1
    }

    if (rightAccount.type === 'group' && leftAccount.type !== 'group') {
      return 1
    }

    return (leftAccount.level ?? 99) - (rightAccount.level ?? 99)
  })

  return nameMatches[0]
}

function buildLiquidityComponent(accounts, config) {
  const account = findLiquidityAccount(accounts, config)

  return {
    g1: getAccountPeriodAmount(account, 'management1'),
    g2: getAccountPeriodAmount(account, 'management2'),
    account: account
      ? { code: account.code, name: account.name, type: account.type, level: account.level }
      : null,
    found: Boolean(account),
  }
}

export function getTotalByCodes(codes, management = 'management2', accounts = readAccounts()) {
  if (!Array.isArray(codes) || !codes.length) {
    return 0
  }

  return roundMoney(
    codes.reduce((sum, code) => {
      const account = accounts.find((entry) => entry.code === normalizeCode(code))
      return sum + getAccountPeriodAmount(account, management)
    }, 0)
  )
}

export function getLiquidityData(accounts = readAccounts()) {
  return {
    currentAssets: buildLiquidityComponent(accounts, {
      exactCodes: ['1.1'],
      codePrefixes: ['1.1'],
      namePatterns: [/^activo\s*corriente$/, /\bactivo\s*corriente\b/],
    }),
    currentLiabilities: buildLiquidityComponent(accounts, {
      exactCodes: ['2.1'],
      codePrefixes: ['2.1'],
      namePatterns: [/^pasivo\s*corriente$/, /\bpasivo\s*corriente\b/],
    }),
    inventory: buildLiquidityComponent(accounts, {
      exactCodes: ['1.1.5', '1.1.3.1'],
      codePrefixes: ['1.1.5', '1.1.3.1'],
      namePatterns: [/^inventarios?$/, /\binventarios?\b/],
    }),
    cash: buildLiquidityComponent(accounts, {
      exactCodes: ['1.1.1'],
      codePrefixes: ['1.1.1'],
      namePatterns: [/^disponibles?$/, /\bdisponib/],
    }),
  }
}

function calculateRatioValue(numerator, denominator) {
  if (!denominator) {
    return null
  }

  return roundMoney(numerator / denominator)
}

export function calculateLiquidityRatios(liquidityData = getLiquidityData()) {
  const ratios = {
    current: { g1: null, g2: null },
    acid: { g1: null, g2: null },
    immediate: { g1: null, g2: null },
  }

  for (const year of ['g1', 'g2']) {
    const currentAssets = liquidityData.currentAssets[year]
    const currentLiabilities = liquidityData.currentLiabilities[year]
    const inventory = liquidityData.inventory[year]
    const cash = liquidityData.cash[year]

    ratios.current[year] = calculateRatioValue(currentAssets, currentLiabilities)
    ratios.acid[year] = calculateRatioValue(currentAssets - inventory, currentLiabilities)
    ratios.immediate[year] = calculateRatioValue(cash, currentLiabilities)
  }

  return ratios
}

function buildRatioTrend(ratioG1, ratioG2) {
  if (ratioG1 === null || ratioG2 === null) {
    return {
      g1: ratioG1,
      g2: ratioG2,
      variation: null,
      percentChange: null,
      trend: null,
    }
  }

  const variation = roundMoney(ratioG2 - ratioG1)
  const percentChange = ratioG1 !== 0 ? roundMoney((variation / ratioG1) * 100) : null

  return {
    g1: ratioG1,
    g2: ratioG2,
    variation,
    percentChange,
    trend: variation > 0 ? 'up' : variation < 0 ? 'down' : 'stable',
  }
}

export function getLiquidityAnalysis(accounts = readAccounts()) {
  const data = getLiquidityData(accounts)
  const rawRatios = calculateLiquidityRatios(data)
  const warnings = []

  if (!data.currentAssets.found) {
    warnings.push('No se encontró la cuenta de Activo Corriente (código 1.1 o nombre equivalente).')
  }

  if (!data.currentLiabilities.found) {
    warnings.push('No se encontró la cuenta de Pasivo Corriente (código 2.1 o nombre equivalente).')
  }

  if (!data.inventory.found) {
    warnings.push('No se encontró la cuenta de Inventarios. La liquidez ácida usará el Activo Corriente completo.')
  }

  if (!data.cash.found) {
    warnings.push('No se encontró la cuenta de Disponibilidades (código 1.1.1 o nombre equivalente).')
  }

  const hasData =
    data.currentAssets.g1 !== 0 ||
    data.currentAssets.g2 !== 0 ||
    data.currentLiabilities.g1 !== 0 ||
    data.currentLiabilities.g2 !== 0

  return {
    data,
    ratios: {
      current: buildRatioTrend(rawRatios.current.g1, rawRatios.current.g2),
      acid: buildRatioTrend(rawRatios.acid.g1, rawRatios.acid.g2),
      immediate: buildRatioTrend(rawRatios.immediate.g1, rawRatios.immediate.g2),
    },
    verticalAnalysis: {
      g1: {
        currentAssetsShare: calculateRatioValue(data.currentAssets.g1, data.currentLiabilities.g1),
        inventoryShare: calculateRatioValue(data.inventory.g1, data.currentLiabilities.g1),
        cashShare: calculateRatioValue(data.cash.g1, data.currentLiabilities.g1),
      },
      g2: {
        currentAssetsShare: calculateRatioValue(data.currentAssets.g2, data.currentLiabilities.g2),
        inventoryShare: calculateRatioValue(data.inventory.g2, data.currentLiabilities.g2),
        cashShare: calculateRatioValue(data.cash.g2, data.currentLiabilities.g2),
      },
    },
    hasData,
    warnings,
  }
}

export function getDebtData(accounts = readAccounts()) {
  const findDebtAccount = (opts) => {
    let candidates = accounts
    if (opts.section) {
      candidates = accounts.filter((a) => {
        if (a.section) {
          return a.section === opts.section
        }
        const code = normalizeCode(a.code)
        if (opts.section === 'balance_general') {
          if (/^[123](\.|$)/.test(code)) return true
          const name = normalizeAccountNameKey(a.name)
          return /activo|pasivo|patrimonio|capital|inventario|disponib|caja|banco/i.test(name)
        }
        if (opts.section === 'estado_resultados') {
          if (/^[45](\.|$)/.test(code)) return true
          const name = normalizeAccountNameKey(a.name)
          return /ingreso|venta|costo|gasto|utilidad|resultado|operativo|interes|financiero/i.test(name)
        }
        return false
      })
    }

    for (const code of opts.exactCodes || []) {
      const normalizedCode = normalizeCode(code)
      const exactMatch = candidates.find((account) => account.code === normalizedCode)
      if (exactMatch) return exactMatch
    }

    for (const prefix of opts.codePrefixes || []) {
      const normalizedPrefix = normalizeCode(prefix)
      const exactPrefixMatch = candidates.find((account) => account.code === normalizedPrefix)
      if (exactPrefixMatch) return exactPrefixMatch

      const prefixMatches = candidates
        .filter((account) => account.code.startsWith(`${normalizedPrefix}.`))
        .sort((leftAccount, rightAccount) => leftAccount.code.length - rightAccount.code.length)

      if (prefixMatches.length) return prefixMatches[0]
    }

    const nameMatches = candidates.filter((account) => {
      const normalizedName = normalizeAccountNameKey(account.name)
      return (opts.namePatterns || []).some((pattern) => pattern.test(normalizedName))
    })

    if (!nameMatches.length) return null

    nameMatches.sort((leftAccount, rightAccount) => {
      if (leftAccount.type === 'group' && rightAccount.type !== 'group') return -1
      if (rightAccount.type === 'group' && leftAccount.type !== 'group') return 1
      return (leftAccount.level ?? 99) - (rightAccount.level ?? 99)
    })

    return nameMatches[0]
  }

  const buildDebtComponent = (config) => {
    const account = findDebtAccount(config)
    return {
      g1: getAccountPeriodAmount(account, 'management1'),
      g2: getAccountPeriodAmount(account, 'management2'),
      account: account
        ? { code: account.code, name: account.name, type: account.type, level: account.level }
        : null,
      found: Boolean(account),
    }
  }

  return {
    totalAssets: buildDebtComponent({
      exactCodes: ['1'],
      codePrefixes: ['1'],
      namePatterns: [/^activo$/, /\bactivo\b/],
      section: 'balance_general',
    }),
    totalLiabilities: buildDebtComponent({
      exactCodes: ['2'],
      codePrefixes: ['2'],
      namePatterns: [/^pasivo$/, /\bpasivo\b/],
      section: 'balance_general',
    }),
    currentLiabilities: buildDebtComponent({
      exactCodes: ['2.1'],
      codePrefixes: ['2.1'],
      namePatterns: [/^pasivo\s*corriente$/, /\bpasivo\s*corriente\b/],
      section: 'balance_general',
    }),
    operatingIncome: buildDebtComponent({
      namePatterns: [/resultado\s*operativo/, /utilidad\s*operativa/],
      section: 'estado_resultados',
    }),
    interestExpense: buildDebtComponent({
      namePatterns: [/gastos?\s*financieros?/, /interes(es)?\s*pagados?/, /interes(es)?/],
      section: 'estado_resultados',
    }),
  }
}

export function calculateDebtRatios(debtData = getDebtData()) {
  const ratios = {
    debtRatio: { g1: null, g2: null },
    interestCoverage: { g1: null, g2: null },
    debtQuality: { g1: null, g2: null },
  }

  for (const year of ['g1', 'g2']) {
    const assets = debtData.totalAssets[year]
    const liabilities = debtData.totalLiabilities[year]
    const currentLiabilities = debtData.currentLiabilities[year]
    const opIncome = debtData.operatingIncome[year]
    const interest = debtData.interestExpense[year]

    ratios.debtRatio[year] = calculateRatioValue(liabilities, assets)
    ratios.interestCoverage[year] = calculateRatioValue(opIncome, interest)
    ratios.debtQuality[year] = calculateRatioValue(currentLiabilities, liabilities)
  }

  return ratios
}

export function getDebtAnalysis(accounts = readAccounts()) {
  const data = getDebtData(accounts)
  const rawRatios = calculateDebtRatios(data)
  const warnings = []

  if (!data.totalAssets.found) {
    warnings.push('No se encontró la cuenta de Activo Total (código 1 o nombre equivalente).')
  }
  if (!data.totalLiabilities.found) {
    warnings.push('No se encontró la cuenta de Pasivo Total (código 2 o nombre equivalente).')
  }
  if (!data.currentLiabilities.found) {
    warnings.push('No se encontró la cuenta de Pasivo Corriente (código 2.1 o nombre equivalente).')
  }
  if (!data.operatingIncome.found) {
    warnings.push('No se encontró la cuenta de Resultado Operativo / Utilidad Operativa en Estado de Resultados.')
  }
  if (!data.interestExpense.found) {
    warnings.push('No se encontró la cuenta de Gastos Financieros / Intereses en Estado de Resultados.')
  }

  const hasData =
    data.totalAssets.g1 !== 0 ||
    data.totalAssets.g2 !== 0 ||
    data.totalLiabilities.g1 !== 0 ||
    data.totalLiabilities.g2 !== 0

  return {
    data,
    ratios: {
      debtRatio: buildRatioTrend(rawRatios.debtRatio.g1, rawRatios.debtRatio.g2),
      interestCoverage: buildRatioTrend(rawRatios.interestCoverage.g1, rawRatios.interestCoverage.g2),
      debtQuality: buildRatioTrend(rawRatios.debtQuality.g1, rawRatios.debtQuality.g2),
    },
    hasData,
    warnings,
  }
}

export function getEfficiencyData(accounts = readAccounts()) {
  const findEfficiencyAccount = (opts) => {
    let candidates = accounts
    if (opts.section) {
      candidates = accounts.filter((a) => {
        if (a.section) {
          return a.section === opts.section
        }
        const code = normalizeCode(a.code)
        if (opts.section === 'balance_general') {
          if (/^[123](\.|$)/.test(code)) return true
          const name = normalizeAccountNameKey(a.name)
          return /activo|pasivo|patrimonio|capital|inventario|disponib|caja|banco/i.test(name)
        }
        if (opts.section === 'estado_resultados') {
          if (/^[45](\.|$)/.test(code)) return true
          const name = normalizeAccountNameKey(a.name)
          return /ingreso|venta|costo|gasto|utilidad|resultado|operativo|interes|financiero/i.test(name)
        }
        return false
      })
    }

    for (const code of opts.exactCodes || []) {
      const normalizedCode = normalizeCode(code)
      const exactMatch = candidates.find((account) => account.code === normalizedCode)
      if (exactMatch) return exactMatch
    }

    for (const prefix of opts.codePrefixes || []) {
      const normalizedPrefix = normalizeCode(prefix)
      const exactPrefixMatch = candidates.find((account) => account.code === normalizedPrefix)
      if (exactPrefixMatch) return exactPrefixMatch

      const prefixMatches = candidates
        .filter((account) => account.code.startsWith(`${normalizedPrefix}.`))
        .sort((leftAccount, rightAccount) => leftAccount.code.length - rightAccount.code.length)

      if (prefixMatches.length) return prefixMatches[0]
    }

    const nameMatches = candidates.filter((account) => {
      const normalizedName = normalizeAccountNameKey(account.name)
      return (opts.namePatterns || []).some((pattern) => pattern.test(normalizedName))
    })

    if (!nameMatches.length) return null

    nameMatches.sort((leftAccount, rightAccount) => {
      if (leftAccount.type === 'group' && rightAccount.type !== 'group') return -1
      if (rightAccount.type === 'group' && leftAccount.type !== 'group') return 1
      return (leftAccount.level ?? 99) - (rightAccount.level ?? 99)
    })

    return nameMatches[0]
  }

  const buildEfficiencyComponent = (config) => {
    const account = findEfficiencyAccount(config)
    return {
      g1: getAccountPeriodAmount(account, 'management1'),
      g2: getAccountPeriodAmount(account, 'management2'),
      account: account
        ? { code: account.code, name: account.name, type: account.type, level: account.level }
        : null,
      found: Boolean(account),
    }
  }

  return {
    sales: buildEfficiencyComponent({
      exactCodes: ['4.1'],
      codePrefixes: ['4.1'],
      namePatterns: [/^ventas$/, /\bventas\b/, /ingreso\s*(por)?\s*ventas?/],
      section: 'estado_resultados',
    }),
    cogs: buildEfficiencyComponent({
      exactCodes: ['5.1'],
      codePrefixes: ['5.1'],
      namePatterns: [/costo\s*(de)?\s*ventas?/, /costo\s*de\s*la\s*mercaderia\s*vendida/],
      section: 'estado_resultados',
    }),
    totalAssets: buildEfficiencyComponent({
      exactCodes: ['1'],
      codePrefixes: ['1'],
      namePatterns: [/^activo$/, /\bactivo\b/],
      section: 'balance_general',
    }),
    receivables: buildEfficiencyComponent({
      exactCodes: ['1.1.3'],
      codePrefixes: ['1.1.3'],
      namePatterns: [/cuentas?\s*por\s*cobrar\s*comerciales?/, /clientes/, /exigible/],
      section: 'balance_general',
    }),
    inventory: buildEfficiencyComponent({
      exactCodes: ['1.1.5', '1.1.3.1'],
      codePrefixes: ['1.1.5', '1.1.3.1'],
      namePatterns: [/inventarios?/, /mercaderias?/, /realizable/],
      section: 'balance_general',
    }),
    payables: buildEfficiencyComponent({
      exactCodes: ['2.1.1'],
      codePrefixes: ['2.1.1'],
      namePatterns: [/deudas?\s*comerciales?/, /deudores?\s*comerciales?/, /proveedores/, /cuentas?\s*por\s*pagar\s*comerciales?/],
      section: 'balance_general',
    }),
  }
}

export function calculateEfficiencyRatios(efficiencyData = getEfficiencyData()) {
  const ratios = {
    assetTurnover: { g1: null, g2: null },
    avgCollectionDays: { g1: null, g2: null },
    avgInventoryDays: { g1: null, g2: null },
    avgPaymentDays: { g1: null, g2: null },
  }

  for (const year of ['g1', 'g2']) {
    const sales = efficiencyData.sales[year]
    const cogs = efficiencyData.cogs[year]
    const assets = efficiencyData.totalAssets[year]
    const receivables = efficiencyData.receivables[year]
    const inventory = efficiencyData.inventory[year]
    const payables = efficiencyData.payables[year]

    // 1. Rotación del activo total
    ratios.assetTurnover[year] = calculateRatioValue(sales, assets)

    // 2. Período promedio de cobro (PPC)
    const recTurnover = calculateRatioValue(sales, receivables)
    ratios.avgCollectionDays[year] = recTurnover ? calculateRatioValue(360, recTurnover) : null

    // 3. Período promedio de inventario (PPI)
    const invTurnover = calculateRatioValue(cogs, inventory)
    ratios.avgInventoryDays[year] = invTurnover ? calculateRatioValue(360, invTurnover) : null

    // 4. Período promedio de pago (PPP)
    const payTurnover = calculateRatioValue(cogs, payables)
    ratios.avgPaymentDays[year] = payTurnover ? calculateRatioValue(360, payTurnover) : null
  }

  return ratios
}

export function getEfficiencyAnalysis(accounts = readAccounts()) {
  const data = getEfficiencyData(accounts)
  const rawRatios = calculateEfficiencyRatios(data)
  const warnings = []

  if (!data.sales.found) {
    warnings.push('No se encontró la cuenta de Ventas Netas / Ingresos (código 4.1 o nombre equivalente).')
  }
  if (!data.cogs.found) {
    warnings.push('No se encontró la cuenta de Costo de Ventas (código 5.1 o nombre equivalente).')
  }
  if (!data.totalAssets.found) {
    warnings.push('No se encontró la cuenta de Activo Total (código 1 o nombre equivalente).')
  }
  if (!data.receivables.found) {
    warnings.push('No se encontró la cuenta de Cuentas por Cobrar Comerciales (código 1.1.3 o nombre equivalente).')
  }
  if (!data.inventory.found) {
    warnings.push('No se encontró la cuenta de Inventarios (código 1.1.5 o nombre equivalente).')
  }
  if (!data.payables.found) {
    warnings.push('No se encontró la cuenta de Deudas Comerciales (código 2.1.1 o nombre equivalente).')
  }

  const hasData =
    data.totalAssets.g1 !== 0 ||
    data.totalAssets.g2 !== 0 ||
    data.sales.g1 !== 0 ||
    data.sales.g2 !== 0

  return {
    data,
    ratios: {
      assetTurnover: buildRatioTrend(rawRatios.assetTurnover.g1, rawRatios.assetTurnover.g2),
      avgCollectionDays: buildRatioTrend(rawRatios.avgCollectionDays.g1, rawRatios.avgCollectionDays.g2),
      avgInventoryDays: buildRatioTrend(rawRatios.avgInventoryDays.g1, rawRatios.avgInventoryDays.g2),
      avgPaymentDays: buildRatioTrend(rawRatios.avgPaymentDays.g1, rawRatios.avgPaymentDays.g2),
    },
    hasData,
    warnings,
  }

}

// ========================= RENTABILIDAD =========================

export function getProfitabilityData(accounts = readAccounts()) {
  const findProfitAccount = (opts) => {
    let candidates = accounts
    if (opts.section) {
      candidates = accounts.filter((a) => {
        if (a.section) return a.section === opts.section
        const code = normalizeCode(a.code)
        if (opts.section === 'balance_general') {
          if (/^[123](\.|$)/.test(code)) return true
          const name = normalizeAccountNameKey(a.name)
          return /activo|pasivo|patrimonio|capital|inventario|disponib|caja|banco/i.test(name)
        }
        if (opts.section === 'estado_resultados') {
          if (/^[45](\.|$)/.test(code)) return true
          const name = normalizeAccountNameKey(a.name)
          return /ingreso|venta|costo|gasto|utilidad|resultado|operativo|interes|financiero|neta/i.test(name)
        }
        return false
      })
    }

    for (const code of opts.exactCodes || []) {
      const normalizedCode = normalizeCode(code)
      const exactMatch = candidates.find((account) => account.code === normalizedCode)
      if (exactMatch) return exactMatch
    }

    for (const prefix of opts.codePrefixes || []) {
      const normalizedPrefix = normalizeCode(prefix)
      const exactPrefixMatch = candidates.find((account) => account.code === normalizedPrefix)
      if (exactPrefixMatch) return exactPrefixMatch

      const prefixMatches = candidates
        .filter((account) => account.code.startsWith(`${normalizedPrefix}.`))
        .sort((a, b) => a.code.length - b.code.length)
      if (prefixMatches.length) return prefixMatches[0]
    }

    const nameMatches = candidates.filter((account) => {
      const normalizedName = normalizeAccountNameKey(account.name)
      return (opts.namePatterns || []).some((pattern) => pattern.test(normalizedName))
    })
    if (!nameMatches.length) return null

    nameMatches.sort((a, b) => {
      if (a.type === 'group' && b.type !== 'group') return -1
      if (b.type === 'group' && a.type !== 'group') return 1
      return (a.level ?? 99) - (b.level ?? 99)
    })
    return nameMatches[0]
  }

  const buildComponent = (config) => {
    const account = findProfitAccount(config)
    return {
      g1: getAccountPeriodAmount(account, 'management1'),
      g2: getAccountPeriodAmount(account, 'management2'),
      account: account ? { code: account.code, name: account.name, type: account.type, level: account.level } : null,
      found: Boolean(account),
    }
  }

  return {
    sales: buildComponent({
      exactCodes: ['4.1'],
      codePrefixes: ['4.1'],
      namePatterns: [/^ventas$/, /\bventas\b/, /ingreso\s*(por)?\s*ventas?/],
      section: 'estado_resultados',
    }),
    cogs: buildComponent({
      exactCodes: ['5.1'],
      codePrefixes: ['5.1'],
      namePatterns: [/costo\s*(de)?\s*ventas?/, /costo\s*de\s*la\s*mercaderia\s*vendida/],
      section: 'estado_resultados',
    }),
    operatingIncome: buildComponent({
      namePatterns: [/resultado\s*operativo/, /utilidad\s*operativa/],
      section: 'estado_resultados',
    }),
    netIncome: buildComponent({
      namePatterns: [/utilidad\s*neta/, /resultado\s*neto/, /ganancia\s*neta/, /resultado\s*del\s*ejercicio/],
      section: 'estado_resultados',
    }),
    totalAssets: buildComponent({
      exactCodes: ['1'],
      codePrefixes: ['1'],
      namePatterns: [/^activo$/, /\bactivo\b/],
      section: 'balance_general',
    }),
    totalEquity: buildComponent({
      exactCodes: ['3'],
      codePrefixes: ['3'],
      namePatterns: [/^patrimonio$/, /\bpatrimonio\b/, /capital/, /reservas/, /resultados\s*acumulados/],
      section: 'balance_general',
    }),
  }
}

export function calculateProfitabilityRatios(profitData = getProfitabilityData()) {
  const ratios = {
    grossMargin: { g1: null, g2: null },
    operatingMargin: { g1: null, g2: null },
    netMargin: { g1: null, g2: null },
    roa: { g1: null, g2: null },
    roe: { g1: null, g2: null },
  }

  for (const year of ['g1', 'g2']) {
    const sales = profitData.sales[year]
    const cogs = profitData.cogs[year]
    const opIncome = profitData.operatingIncome[year]
    const netInc = profitData.netIncome[year]
    const assets = profitData.totalAssets[year]
    const equity = profitData.totalEquity[year]

    const grossProfit = sales - cogs
    ratios.grossMargin[year] = calculateRatioValue(grossProfit, sales)
    ratios.operatingMargin[year] = calculateRatioValue(opIncome, sales)
    ratios.netMargin[year] = calculateRatioValue(netInc, sales)
    ratios.roa[year] = calculateRatioValue(netInc, assets)
    ratios.roe[year] = calculateRatioValue(netInc, equity)
  }

  return ratios
}

export function getProfitabilityAnalysis(accounts = readAccounts()) {
  const data = getProfitabilityData(accounts)
  const rawRatios = calculateProfitabilityRatios(data)
  const warnings = []

  if (!data.sales.found) warnings.push('No se encontró la cuenta de Ventas Netas (código 4.1 o nombre equivalente).')
  if (!data.cogs.found) warnings.push('No se encontró la cuenta de Costo de Ventas (código 5.1 o nombre equivalente).')
  if (!data.operatingIncome.found) warnings.push('No se encontró la cuenta de Resultado Operativo / Utilidad Operativa.')
  if (!data.netIncome.found) warnings.push('No se encontró la cuenta de Utilidad Neta / Resultado Neto.')
  if (!data.totalAssets.found) warnings.push('No se encontró la cuenta de Activo Total (código 1).')
  if (!data.totalEquity.found) warnings.push('No se encontró la cuenta de Patrimonio Total (código 3).')

  const hasData = data.sales.g2 !== 0 || data.netIncome.g2 !== 0

  // DuPont
  const dupont = {
    netMargin: rawRatios.netMargin.g2,
    assetTurnover: rawRatios.grossMargin.g2 !== null ? (data.sales.g2 / data.totalAssets.g2) : null,
    financialLeverage: data.totalEquity.g2 !== 0 ? data.totalAssets.g2 / data.totalEquity.g2 : null,
  }
  if (dupont.netMargin !== null && dupont.assetTurnover !== null) {
    dupont.roa = dupont.netMargin * dupont.assetTurnover
  } else {
    dupont.roa = null
  }
  if (dupont.roa !== null && dupont.financialLeverage !== null) {
    dupont.roe = dupont.roa * dupont.financialLeverage
  } else {
    dupont.roe = null
  }

  return {
    data,
    ratios: {
      grossMargin: buildRatioTrend(rawRatios.grossMargin.g1, rawRatios.grossMargin.g2),
      operatingMargin: buildRatioTrend(rawRatios.operatingMargin.g1, rawRatios.operatingMargin.g2),
      netMargin: buildRatioTrend(rawRatios.netMargin.g1, rawRatios.netMargin.g2),
      roa: buildRatioTrend(rawRatios.roa.g1, rawRatios.roa.g2),
      roe: buildRatioTrend(rawRatios.roe.g1, rawRatios.roe.g2),
      dupont,
    },
    hasData,
    warnings,
  }
}

// ========================= OVERRIDES MANUALES =========================

// ----- LIQUIDEZ con overrides -----
export function getLiquidityDataWithOverrides(accounts = readAccounts(), overrides = {}) {
  const baseData = getLiquidityData(accounts)

  const applyOverride = (key, overrideCode) => {
    if (!overrideCode) return
    const account = findAccountByCode(overrideCode)
    if (account) {
      baseData[key] = {
        g1: getAccountPeriodAmount(account, 'management1'),
        g2: getAccountPeriodAmount(account, 'management2'),
        account: { code: account.code, name: account.name, type: account.type, level: account.level },
        found: true,
      }
    }
  }

  applyOverride('currentAssets', overrides.currentAssets)
  applyOverride('currentLiabilities', overrides.currentLiabilities)
  applyOverride('inventory', overrides.inventory)
  applyOverride('cash', overrides.cash)

  return baseData
}

export function getLiquidityAnalysisWithOverrides(accounts = readAccounts(), overrides = {}) {
  const data = getLiquidityDataWithOverrides(accounts, overrides)
  const rawRatios = calculateLiquidityRatios(data)
  const warnings = []

  if (!data.currentAssets.found) warnings.push('No se encontró la cuenta de Activo Corriente (código 1.1 o nombre equivalente).')
  if (!data.currentLiabilities.found) warnings.push('No se encontró la cuenta de Pasivo Corriente (código 2.1 o nombre equivalente).')
  if (!data.inventory.found) warnings.push('No se encontró la cuenta de Inventarios. La liquidez ácida usará el Activo Corriente completo.')
  if (!data.cash.found) warnings.push('No se encontró la cuenta de Disponibilidades (código 1.1.1 o nombre equivalente).')

  const hasData = data.currentAssets.g1 !== 0 || data.currentAssets.g2 !== 0 ||
    data.currentLiabilities.g1 !== 0 || data.currentLiabilities.g2 !== 0

  return {
    data,
    ratios: {
      current: buildRatioTrend(rawRatios.current.g1, rawRatios.current.g2),
      acid: buildRatioTrend(rawRatios.acid.g1, rawRatios.acid.g2),
      immediate: buildRatioTrend(rawRatios.immediate.g1, rawRatios.immediate.g2),
    },
    verticalAnalysis: {
      g1: {
        currentAssetsShare: calculateRatioValue(data.currentAssets.g1, data.currentLiabilities.g1),
        inventoryShare: calculateRatioValue(data.inventory.g1, data.currentLiabilities.g1),
        cashShare: calculateRatioValue(data.cash.g1, data.currentLiabilities.g1),
      },
      g2: {
        currentAssetsShare: calculateRatioValue(data.currentAssets.g2, data.currentLiabilities.g2),
        inventoryShare: calculateRatioValue(data.inventory.g2, data.currentLiabilities.g2),
        cashShare: calculateRatioValue(data.cash.g2, data.currentLiabilities.g2),
      },
    },
    hasData,
    warnings,
  }
}

// ----- DEUDA con overrides -----
export function getDebtDataWithOverrides(accounts = readAccounts(), overrides = {}) {
  const baseData = getDebtData(accounts)

  const applyOverride = (key, overrideCode) => {
    if (!overrideCode) return
    const account = findAccountByCode(overrideCode)
    if (account && baseData[key]) {
      baseData[key] = {
        g1: getAccountPeriodAmount(account, 'management1'),
        g2: getAccountPeriodAmount(account, 'management2'),
        account: { code: account.code, name: account.name, type: account.type, level: account.level },
        found: true,
      }
    }
  }

  applyOverride('totalAssets', overrides.totalAssets)
  applyOverride('totalLiabilities', overrides.totalLiabilities)
  applyOverride('currentLiabilities', overrides.currentLiabilities)
  applyOverride('operatingIncome', overrides.operatingIncome)
  applyOverride('interestExpense', overrides.interestExpense)

  return baseData
}

export function getDebtAnalysisWithOverrides(accounts = readAccounts(), overrides = {}) {
  const data = getDebtDataWithOverrides(accounts, overrides)
  const rawRatios = calculateDebtRatios(data)
  const warnings = []

  if (!data.totalAssets.found) warnings.push('No se encontró la cuenta de Activo Total (código 1 o nombre equivalente).')
  if (!data.totalLiabilities.found) warnings.push('No se encontró la cuenta de Pasivo Total (código 2 o nombre equivalente).')
  if (!data.currentLiabilities.found) warnings.push('No se encontró la cuenta de Pasivo Corriente (código 2.1 o nombre equivalente).')
  if (!data.operatingIncome.found) warnings.push('No se encontró la cuenta de Resultado Operativo / Utilidad Operativa en Estado de Resultados.')
  if (!data.interestExpense.found) warnings.push('No se encontró la cuenta de Gastos Financieros / Intereses en Estado de Resultados.')

  const hasData = data.totalAssets.g1 !== 0 || data.totalAssets.g2 !== 0 ||
    data.totalLiabilities.g1 !== 0 || data.totalLiabilities.g2 !== 0

  return {
    data,
    ratios: {
      debtRatio: buildRatioTrend(rawRatios.debtRatio.g1, rawRatios.debtRatio.g2),
      interestCoverage: buildRatioTrend(rawRatios.interestCoverage.g1, rawRatios.interestCoverage.g2),
      debtQuality: buildRatioTrend(rawRatios.debtQuality.g1, rawRatios.debtQuality.g2),
    },
    hasData,
    warnings,
  }
}

// ----- EFICIENCIA con overrides -----
export function getEfficiencyDataWithOverrides(accounts = readAccounts(), overrides = {}) {
  const baseData = getEfficiencyData(accounts)

  const applyOverride = (key, overrideCode) => {
    if (!overrideCode) return
    const account = findAccountByCode(overrideCode)
    if (account && baseData[key]) {
      baseData[key] = {
        g1: getAccountPeriodAmount(account, 'management1'),
        g2: getAccountPeriodAmount(account, 'management2'),
        account: { code: account.code, name: account.name, type: account.type, level: account.level },
        found: true,
      }
    }
  }

  applyOverride('sales', overrides.sales)
  applyOverride('cogs', overrides.cogs)
  applyOverride('totalAssets', overrides.totalAssets)
  applyOverride('receivables', overrides.receivables)
  applyOverride('inventory', overrides.inventory)
  applyOverride('payables', overrides.payables)

  return baseData
}

export function getEfficiencyAnalysisWithOverrides(accounts = readAccounts(), overrides = {}) {
  const data = getEfficiencyDataWithOverrides(accounts, overrides)
  const rawRatios = calculateEfficiencyRatios(data)
  const warnings = []

  if (!data.sales.found) warnings.push('No se encontró la cuenta de Ventas Netas / Ingresos (código 4.1 o nombre equivalente).')
  if (!data.cogs.found) warnings.push('No se encontró la cuenta de Costo de Ventas (código 5.1 o nombre equivalente).')
  if (!data.totalAssets.found) warnings.push('No se encontró la cuenta de Activo Total (código 1 o nombre equivalente).')
  if (!data.receivables.found) warnings.push('No se encontró la cuenta de Cuentas por Cobrar Comerciales (código 1.1.3 o nombre equivalente).')
  if (!data.inventory.found) warnings.push('No se encontró la cuenta de Inventarios (código 1.1.5 o nombre equivalente).')
  if (!data.payables.found) warnings.push('No se encontró la cuenta de Deudas Comerciales (código 2.1.1 o nombre equivalente).')

  const hasData = data.totalAssets.g1 !== 0 || data.totalAssets.g2 !== 0 ||
    data.sales.g1 !== 0 || data.sales.g2 !== 0

  return {
    data,
    ratios: {
      assetTurnover: buildRatioTrend(rawRatios.assetTurnover.g1, rawRatios.assetTurnover.g2),
      avgCollectionDays: buildRatioTrend(rawRatios.avgCollectionDays.g1, rawRatios.avgCollectionDays.g2),
      avgInventoryDays: buildRatioTrend(rawRatios.avgInventoryDays.g1, rawRatios.avgInventoryDays.g2),
      avgPaymentDays: buildRatioTrend(rawRatios.avgPaymentDays.g1, rawRatios.avgPaymentDays.g2),
    },
    hasData,
    warnings,
  }
}

// ----- RENTABILIDAD con overrides -----
export function getProfitabilityDataWithOverrides(accounts = readAccounts(), overrides = {}) {
  const baseData = getProfitabilityData(accounts)

  const applyOverride = (key, overrideCode) => {
    if (!overrideCode) return
    const account = findAccountByCode(overrideCode)
    if (account && baseData[key]) {
      baseData[key] = {
        g1: getAccountPeriodAmount(account, 'management1'),
        g2: getAccountPeriodAmount(account, 'management2'),
        account: { code: account.code, name: account.name, type: account.type, level: account.level },
        found: true,
      }
    }
  }

  applyOverride('sales', overrides.sales)
  applyOverride('cogs', overrides.cogs)
  applyOverride('operatingIncome', overrides.operatingIncome)
  applyOverride('netIncome', overrides.netIncome)
  applyOverride('totalAssets', overrides.totalAssets)
  applyOverride('totalEquity', overrides.totalEquity)

  return baseData
}

export function getProfitabilityAnalysisWithOverrides(accounts = readAccounts(), overrides = {}) {
  const data = getProfitabilityDataWithOverrides(accounts, overrides)
  const rawRatios = calculateProfitabilityRatios(data)
  const warnings = []

  if (!data.sales.found) warnings.push('No se encontró la cuenta de Ventas Netas (código 4.1 o nombre equivalente).')
  if (!data.cogs.found) warnings.push('No se encontró la cuenta de Costo de Ventas (código 5.1 o nombre equivalente).')
  if (!data.operatingIncome.found) warnings.push('No se encontró la cuenta de Resultado Operativo / Utilidad Operativa.')
  if (!data.netIncome.found) warnings.push('No se encontró la cuenta de Utilidad Neta / Resultado Neto.')
  if (!data.totalAssets.found) warnings.push('No se encontró la cuenta de Activo Total (código 1).')
  if (!data.totalEquity.found) warnings.push('No se encontró la cuenta de Patrimonio Total (código 3).')

  const hasData = data.sales.g2 !== 0 || data.netIncome.g2 !== 0

  const dupont = {
    netMargin: rawRatios.netMargin.g2,
    assetTurnover: rawRatios.grossMargin.g2 !== null ? (data.sales.g2 / data.totalAssets.g2) : null,
    financialLeverage: data.totalEquity.g2 !== 0 ? data.totalAssets.g2 / data.totalEquity.g2 : null,
  }
  if (dupont.netMargin !== null && dupont.assetTurnover !== null) dupont.roa = dupont.netMargin * dupont.assetTurnover
  else dupont.roa = null
  if (dupont.roa !== null && dupont.financialLeverage !== null) dupont.roe = dupont.roa * dupont.financialLeverage
  else dupont.roe = null

  return {
    data,
    ratios: {
      grossMargin: buildRatioTrend(rawRatios.grossMargin.g1, rawRatios.grossMargin.g2),
      operatingMargin: buildRatioTrend(rawRatios.operatingMargin.g1, rawRatios.operatingMargin.g2),
      netMargin: buildRatioTrend(rawRatios.netMargin.g1, rawRatios.netMargin.g2),
      roa: buildRatioTrend(rawRatios.roa.g1, rawRatios.roa.g2),
      roe: buildRatioTrend(rawRatios.roe.g1, rawRatios.roe.g2),
      dupont,
    },
    hasData,
    warnings,
  }
}