import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createLocalStorageMock() {
  const storage = new Map()

  return {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null
    },
    setItem(key, value) {
      storage.set(key, String(value))
    },
    removeItem(key) {
      storage.delete(key)
    },
    clear() {
      storage.clear()
    },
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function run() {
  console.log('Running smoke tests...')

  globalThis.window = {
    localStorage: createLocalStorageMock(),
  }

  // Import the store
  const storePath = path.join(__dirname, '..', 'src', 'utils', 'accountsStore.js')
  const storeUrl = pathToFileURL(storePath).href
  const store = await import(storeUrl)

  // Read sample CSV
  const csvPath = path.join(__dirname, '..', 'excelTest', 'plan-cuentas-sumatorias-prueba.csv')
  const csvText = await fs.readFile(csvPath, 'utf8')

  try {
    console.log('- Verifying utility helpers')
    assert(store.normalizeCode(' 1. 2.3 ') === '1.2.3', 'normalizeCode failed')
    assert(store.getAccountLevel('1.2.3') === 3, 'getAccountLevel failed')
    assert(store.getParentCode('1.2.3') === '1.2', 'getParentCode failed')
    assert(store.parseMoney('1.234,50') === 1234.5, 'parseMoney failed')

    console.log('- Extracting codes from CSV')
    const codes = store.extractAccountCodesFromCsvText(csvText)
    assert(Array.isArray(codes) && codes.length > 0, 'No se extrajeron códigos del CSV')
    console.log(`  -> Found ${codes.length} codes`)

    console.log('- Importing CSV (skip duplicates)')
    const importResult = store.importAccountsFromCsvText(csvText, { onDuplicate: 'skip' })
    assert(importResult && typeof importResult.imported === 'number', 'Import returned invalid result')
    assert(importResult.imported > 0, 'No se importaron cuentas desde el CSV')
    console.log(`  -> Imported: ${importResult.imported}, Skipped: ${importResult.skipped?.length ?? 0}, AutoCreated: ${importResult.autoCreated?.length ?? 0}`)

    console.log('- Reading imported accounts')
    const accounts = store.readAccounts()
    assert(Array.isArray(accounts) && accounts.length > 0, 'readAccounts no devolvió cuentas')
    console.log(`  -> readAccounts returned ${accounts.length} accounts`)

    console.log('- Checking summary and financial statements')
    const summary = store.getAccountSummary(accounts)
    const statements = store.getFinancialStatements(accounts)
    assert(summary.totalAccounts === accounts.length, 'getAccountSummary returned inconsistent totals')
    assert(statements && typeof statements === 'object', 'getFinancialStatements returned invalid data')
    console.log(`  -> Summary total accounts: ${summary.totalAccounts}`)

    console.log('- Checking liquidity analysis')
    const liquidityData = store.getLiquidityData(accounts)
    const liquidityRatios = store.calculateLiquidityRatios(liquidityData)
    const liquidityAnalysis = store.getLiquidityAnalysis(accounts)
    assert(liquidityData && typeof liquidityData.currentAssets === 'object', 'getLiquidityData returned invalid data')
    assert(liquidityRatios.current && 'g1' in liquidityRatios.current, 'calculateLiquidityRatios returned invalid data')
    assert(liquidityAnalysis.ratios && liquidityAnalysis.ratios.current, 'getLiquidityAnalysis returned invalid data')
    console.log(`  -> Liquidez corriente G2: ${liquidityRatios.current.g2 ?? 'N/D'}`)

    console.log('- Checking debt analysis')
    const debtData = store.getDebtData(accounts)
    const debtRatios = store.calculateDebtRatios(debtData)
    const debtAnalysis = store.getDebtAnalysis(accounts)
    assert(debtData && typeof debtData.totalAssets === 'object', 'getDebtData returned invalid data')
    assert(debtRatios.debtRatio && 'g1' in debtRatios.debtRatio, 'calculateDebtRatios returned invalid data')
    assert(debtAnalysis.ratios && debtAnalysis.ratios.debtRatio, 'getDebtAnalysis returned invalid data')
    console.log(`  -> Índice de deuda G2: ${debtRatios.debtRatio.g2 ?? 'N/D'}`)

    console.log('- Checking efficiency analysis')
    const efficiencyData = store.getEfficiencyData(accounts)
    const efficiencyRatios = store.calculateEfficiencyRatios(efficiencyData)
    const efficiencyAnalysis = store.getEfficiencyAnalysis(accounts)
    assert(efficiencyData && typeof efficiencyData.totalAssets === 'object', 'getEfficiencyData returned invalid data')
    assert(efficiencyRatios.assetTurnover && 'g1' in efficiencyRatios.assetTurnover, 'calculateEfficiencyRatios returned invalid data')
    assert(efficiencyAnalysis.ratios && efficiencyAnalysis.ratios.assetTurnover, 'getEfficiencyAnalysis returned invalid data')
    console.log(`  -> Rotación del activo G2: ${efficiencyRatios.assetTurnover.g2 ?? 'N/D'}`)

    console.log('- Verifying export and CRUD flow')
    const exportText = store.exportAccountsToCsvText(accounts)
    assert(exportText.includes('codigo;nombre;nivel;tipo'), 'CSV export header missing')

    const saveResult = store.saveAccount({ code: '9.9.9.9', name: 'TEST ACCOUNT', management1: '10', management2: '20' })
    assert(saveResult.ok && saveResult.account, 'No se pudo guardar la cuenta de prueba')
    assert(store.findAccountByCode('9.9.9.9'), 'findAccountByCode no encontró la cuenta guardada')

    const deleteResult = store.deleteAccount('9.9.9.9')
    assert(deleteResult.ok, 'No se pudo eliminar la cuenta de prueba')
    assert(!store.findAccountByCode('9.9.9.9'), 'La cuenta de prueba no se eliminó')

    console.log('Smoke tests passed ✅')
  } finally {
    if (globalThis.window?.localStorage) {
      globalThis.window.localStorage.clear()
    }
  }
}

run().catch((err) => {
  console.error('Smoke tests failed ❌')
  console.error(err)
  process.exit(1)
})
