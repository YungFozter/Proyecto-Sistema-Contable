// src/utils/csvParser.js
// Detecta secciones contables en un CSV libre, asigna códigos jerárquicos
// y devuelve las cuentas listas para importar al sistema.

/**
 * Mapa de jerarquía contable estándar.
 * Permite que el parser identifique el nivel de una cuenta por su nombre.
 */
const ACCOUNT_HIERARCHY = {
  // ── ESTADO DE RESULTADOS ──────────────────────────────────────────────
  'ingresos': { section: 'estado_resultados', level: 1, parentCode: null },
  'costos de ventas': { section: 'estado_resultados', level: 1, parentCode: null },
  'utilidad bruta': { section: 'estado_resultados', level: 1, parentCode: null, isSubtotal: true },
  'gastos de personal': { section: 'estado_resultados', level: 2, parentGroup: 'gastos operativos' },
  'gastos administrativos': { section: 'estado_resultados', level: 2, parentGroup: 'gastos operativos' },
  'gastos generales': { section: 'estado_resultados', level: 2, parentGroup: 'gastos operativos' },
  'gastos operativos': { section: 'estado_resultados', level: 1, parentCode: null },
  'utilidad operativa': { section: 'estado_resultados', level: 1, parentCode: null, isSubtotal: true },
  'otros ingresos': { section: 'estado_resultados', level: 2, parentGroup: 'otros resultados' },
  'costos financieros': { section: 'estado_resultados', level: 2, parentGroup: 'otros resultados' },
  'otros resultados': { section: 'estado_resultados', level: 1, parentCode: null },
  'utilidad antes de impuestos': { section: 'estado_resultados', level: 1, parentCode: null, isSubtotal: true },
  'impuestos': { section: 'estado_resultados', level: 1, parentCode: null },
  'utilidad neta': { section: 'estado_resultados', level: 1, parentCode: null, isSubtotal: true },

  // ── BALANCE GENERAL ───────────────────────────────────────────────────
  'activo': { section: 'balance_general', level: 1, parentCode: null },
  'activo corriente': { section: 'balance_general', level: 2, parentGroup: 'activo' },
  'activo no corriente': { section: 'balance_general', level: 2, parentGroup: 'activo' },
  'activo fijo': { section: 'balance_general', level: 2, parentGroup: 'activo' },
  'caja': { section: 'balance_general', level: 3, parentGroup: 'activo corriente' },
  'bancos': { section: 'balance_general', level: 3, parentGroup: 'activo corriente' },
  'cuentas por cobrar': { section: 'balance_general', level: 3, parentGroup: 'activo corriente' },
  'inventarios': { section: 'balance_general', level: 3, parentGroup: 'activo corriente' },
  'pasivo': { section: 'balance_general', level: 1, parentCode: null },
  'pasivo corriente': { section: 'balance_general', level: 2, parentGroup: 'pasivo' },
  'pasivo no corriente': { section: 'balance_general', level: 2, parentGroup: 'pasivo' },
  'cuentas por pagar': { section: 'balance_general', level: 3, parentGroup: 'pasivo corriente' },
  'deudas bancarias': { section: 'balance_general', level: 3, parentGroup: 'pasivo corriente' },
  'patrimonio': { section: 'balance_general', level: 1, parentCode: null },
  'capital': { section: 'balance_general', level: 2, parentGroup: 'patrimonio' },
  'reservas': { section: 'balance_general', level: 2, parentGroup: 'patrimonio' },
  'resultados acumulados': { section: 'balance_general', level: 2, parentGroup: 'patrimonio' },
  'total activo': { section: 'balance_general', level: 1, isSubtotal: true },
  'total pasivo': { section: 'balance_general', level: 1, isSubtotal: true },
  'total patrimonio': { section: 'balance_general', level: 1, isSubtotal: true },
  'total pasivo y patrimonio': { section: 'balance_general', level: 1, isSubtotal: true },
}

/** Limpia un texto de espacios extra y lo normaliza a minúsculas */
function normalize(str) {
  return String(str ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Convierte texto tipo "1,234,567" o "(500)" a número */
function parseNumericValue(raw) {
  if (!raw || String(raw).trim() === '-' || String(raw).trim() === '') return 0
  
  let text = String(raw).trim()
  // Eliminar comillas dobles al inicio y final
  text = text.replace(/^"|"$/g, '')
  
  // Detectar paréntesis como negativo
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1).trim()
  }
  
  // Remover caracteres no numéricos excepto coma, punto, guion
  text = text.replace(/[^0-9.,-]/g, '')
  if (!text) return 0
  
  // Manejo de decimales y miles
  const hasComma = text.indexOf(',') !== -1
  const hasDot = text.indexOf('.') !== -1
  
  if (hasComma && hasDot) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(/,/g, '.')
    } else {
      text = text.replace(/,/g, '')
    }
  } else if (hasComma && !hasDot) {
    const parts = text.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      text = parts.join('.')
    } else {
      text = text.replace(/,/g, '')
    }
  } else {
    text = text.replace(/,/g, '')
  }
  
  const num = Number(text)
  return Number.isFinite(num) ? (negative ? -num : num) : 0
}

/**
 * Detecta en qué sección contable estamos basándose en palabras clave
 * encontradas en las primeras columnas del CSV.
 */
function detectSection(cellValue) {
  const val = normalize(cellValue)
  if (val.includes('estado de resultado') || val.includes('resultados')) return 'estado_resultados'
  if (val.includes('balance general') || val.includes('balance')) return 'balance_general'
  return null
}

/**
 * Encuentra la fila que contiene años (mínimo 2 números de 4 dígitos).
 * Devuelve { rowIndex, yearColumns } donde yearColumns son los índices de las columnas con años.
 */
function findYearRow(lines) {
  for (let i = 0; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i])
    const yearIndices = []
    for (let j = 0; j < cells.length; j++) {
      const val = cells[j].trim()
      if (/^(19|20)\d{2}$/.test(val)) {
        yearIndices.push(j)
      }
    }
    if (yearIndices.length >= 2) {
      return { rowIndex: i, yearColumns: yearIndices }
    }
  }
  return { rowIndex: -1, yearColumns: [] }
}

/**
 * Encuentra la columna que contiene los nombres de las cuentas.
 * Se busca la columna con mayor cantidad de texto no numérico después de la fila de años.
 */
function findNameColumn(lines, startRow, yearColumns) {
  const candidates = []
  for (let col = 0; col < 10; col++) { // revisar primeras 10 columnas
    let textCount = 0
    for (let i = startRow; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i])
      const val = cells[col]?.trim()
      if (val && !/^[\d,.()+-]+$/.test(val) && !/^(19|20)\d{2}$/.test(val)) {
        textCount++
      }
    }
    candidates.push({ col, count: textCount })
  }
  candidates.sort((a, b) => b.count - a.count)
  return candidates[0]?.col ?? 1 // por defecto columna 1 si no hay mejor
}

/**
 * Función principal exportada.
 * Recibe el texto crudo del CSV y devuelve un array de cuentas con:
 *   { code, name, level, type, section, management1, management2, variation }
 */
export function parseCsvToAccounts(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length < 3) return []

  // 1. Encontrar la fila de años
  const { rowIndex: yearRowIndex, yearColumns } = findYearRow(lines)
  if (yearRowIndex === -1 || yearColumns.length < 2) {
    return [] // No se encontraron años, no podemos procesar
  }

  // 2. Encontrar la columna de nombres de cuenta
  const nameColumn = findNameColumn(lines, yearRowIndex + 1, yearColumns)

  // 3. Determinar la sección (balance o resultados) por palabras clave en las primeras filas
  let currentSection = null
  for (let i = 0; i < Math.min(5, yearRowIndex); i++) {
    const cells = parseCSVLine(lines[i])
    for (const cell of cells) {
      const detected = detectSection(cell)
      if (detected) {
        currentSection = detected
        break
      }
    }
    if (currentSection) break
  }
  if (!currentSection) currentSection = 'estado_resultados' // default

  // 4. Procesar las filas de cuentas (después de la fila de años)
  const accounts = []
  const codeCounters = { estado_resultados: 0, balance_general: 0 }

  for (let i = yearRowIndex + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i])
    const accountName = cells[nameColumn]?.trim()
    if (!accountName) continue

    // Saltar filas de metadatos o totales
    const nameLower = accountName.toLowerCase()
    if (/empresa|gestion|exp\.|moneda|total|notas/i.test(nameLower)) continue

    // Extraer valores de las columnas de años
    let management1 = 0, management2 = 0
    if (yearColumns.length >= 2) {
      const raw1 = cells[yearColumns[0]]?.trim() || ''
      const raw2 = cells[yearColumns[1]]?.trim() || ''
      console.log(`Cuenta: ${accountName}, raw1: ${raw1}, raw2: ${raw2}`)
      management1 = parseNumericValue(raw1)
      management2 = parseNumericValue(raw2)
      console.log(`management1: ${management1}, management2: ${management2}`)
    }else if (yearColumns.length === 1) {
      management1 = parseNumericValue(cells[yearColumns[0]]?.trim() || '')
    }

    // Asignar un código provisional (nivel 1, secuencial)
    const sectionCount = codeCounters[currentSection] || 0
    codeCounters[currentSection] = sectionCount + 1
    const provisionalCode = String(sectionCount + 1)

    accounts.push({
      code: provisionalCode,
      name: accountName,
      level: 4,
      type: 'detail',
      section: currentSection,
      isSubtotal: /utilidad|total/i.test(nameLower),
      management1,
      management2,
      variation: management2 - management1,
      manualManagement1: management1,
      manualManagement2: management2,
      parentCode: null,
    })
  }

  return accounts
}


/**
 * Infiere el nivel de una cuenta cuando no está en el mapa de jerarquía.
 * Usa la posición (columna de indentación) como pista.
 */
function inferLevel(name, colIndex, allCells) {
  // Si la celda de nombre está en columna 0 → nivel 1
  // columna 1 → nivel 2, etc.
  if (colIndex <= 0) return 1
  if (colIndex === 1) return 2
  if (colIndex === 2) return 3
  return 4
}

/**
 * Genera el código contable para una cuenta nueva.
 * Ejemplo de salida: "4", "4.1", "4.1.1", "5", "5.1"
 */
function generateCode(section, level, nameLower, counters) {
  const c = counters[section]

  if (level === 1) {
    c.level1 += 1
    c.level2[c.level1] = 0
    return String(c.level1)
  }

  if (level === 2) {
    const parent = c.level1
    c.level2[parent] = (c.level2[parent] ?? 0) + 1
    const sub = c.level2[parent]
    // init level3 counters
    if (!c[`level3_${parent}_${sub}`]) c[`level3_${parent}_${sub}`] = 0
    return `${parent}.${sub}`
  }

  if (level === 3) {
    const parent = c.level1
    const sub = c.level2[parent] ?? 1
    const key = `level3_${parent}_${sub}`
    c[key] = (c[key] ?? 0) + 1
    return `${parent}.${sub}.${c[key]}`
  }

  // level 4+
  return `${c.level1}.${c.level2[c.level1] ?? 1}.1.${Date.now() % 1000}`
}

/**
 * Mini-parser de línea CSV que respeta comillas.
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}