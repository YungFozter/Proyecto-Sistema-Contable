import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function run() {
  const storePath = path.join(__dirname, '..', 'src', 'utils', 'accountsStore.js')
  const store = await import(pathToFileURL(storePath).href)

  const csvPath = path.join(__dirname, '..', 'excelTest', 'Estados Financieros Lavatodo Balance Gral.csv')
  const csvText = await fs.readFile(csvPath, 'utf8')

  console.log('Parsing CSV...')
  const parsed = store.parseCsvText ? store.parseCsvText(csvText) : { headers: [], rows: [] }
  console.log('Detected headers:', parsed.headers)
  console.log('Parsed rows:', parsed.rows.length)
  if (parsed.rows.length) {
    console.log('First rows preview:')
    console.log(parsed.rows.slice(0, 5))
  }

  console.log('Attempting import...')
  const result = store.importAccountsFromCsvText(csvText, { onDuplicate: 'skip' })
  console.log('Import result:')
  console.log(result)

  // Try reading XLSX variant if supported
  const xlsxPath = path.join(__dirname, '..', 'excelTest', 'Avance de pronosticos 28-4-26.xlsx')
  try {
    const xlsxBuf = await fs.readFile(xlsxPath)
    if (store.parseXlsxBuffer) {
      console.log('\nParsing XLSX...')
      const parsedX = await store.parseXlsxBuffer(xlsxBuf)
      console.log('Detected headers (XLSX):', parsedX.headers)
      console.log('Parsed rows (XLSX):', parsedX.rows.length)
      if (parsedX.rows.length) console.log(parsedX.rows.slice(0, 6))
      console.log('Attempting import of XLSX rows...')
      const r2 = store.importAccountsFromRows(parsedX.rows, { onDuplicate: 'skip' })
      console.log('XLSX import result:')
      console.log(r2)
    } else {
      console.log('XLSX parser not available in store.')
    }
  } catch (e) {
    // ignore if file missing or parse failed
  }
}

run().catch((err) => { console.error(err); process.exit(1) })
