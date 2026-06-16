# Implementación del análisis de Endeudamiento (Deuda)

## 1. Indicadores a implementar (según hoja "DEUDA" del Excel)

- **Índice de deuda** = Pasivo Total / Activo Total  
- **Índice de cobertura de intereses** = Resultado Operativo / Gastos Financieros (Intereses)  
- **Índice de calidad de deuda** = Pasivo Corriente / Pasivo Total  

Todos los datos se extraen del Balance General y del Estado de Resultados (hoja "BG - ER").

## 2. Datos necesarios desde el plan de cuentas

- **Activo Total** → suma de todas las cuentas de activo (código raíz `1` o campo `section === 'balance_general'` con nombre "Activo").
- **Pasivo Total** → suma de todas las cuentas de pasivo (código raíz `2`).
- **Pasivo Corriente** → cuentas con código `2.1.*` o que contengan “pasivo corriente”.
- **Resultado Operativo** → cuenta específica del Estado de Resultados (ej. “Resultado Operativo”).
- **Gastos Financieros** → cuenta de “Gastos Financieros” o “Intereses pagados”.

En el proyecto actual, `getFinancialStatements()` ya devuelve activo, pasivo y patrimonio. Se puede reutilizar.

## 3. Funciones a agregar en `accountsStore.js`

Añade las siguientes funciones para calcular los ratios de deuda:

```javascript
// Obtener total de una lista de códigos o filtro por patrón
export const getTotalByCodes = (codes, management = 'management2') => {
  const accounts = readAccounts();
  return codes.reduce((sum, code) => {
    const acc = findAccountByCode(code);
    return sum + (acc ? Number(acc[management]) : 0);
  }, 0);
};

// Obtener los ratios de endeudamiento
export const getDebtRatios = () => {
  const statements = getFinancialStatements(); // ya existe
  const accounts = readAccounts();

  // Buscar Resultado Operativo y Gastos Financieros en cuentas de Estado de Resultados
  const operatingIncome = accounts.find(a => 
    a.section === 'estado_resultados' && /resultado operativo|utilidad operativa/i.test(a.name)
  );
  const interestExpense = accounts.find(a => 
    a.section === 'estado_resultados' && /gastos financieros|intereses/i.test(a.name)
  );

  const totalAssets = {
    g1: statements.balanceGeneral.previous.assets,
    g2: statements.balanceGeneral.current.assets,
  };
  const totalLiabilities = {
    g1: statements.balanceGeneral.previous.liabilities,
    g2: statements.balanceGeneral.current.liabilities,
  };

  // Pasivo Corriente: asumiendo código raíz '2.1'
  const currentLiabilities = {
    g1: getTotalByCodes(['2.1'], 'management1'),
    g2: getTotalByCodes(['2.1'], 'management2'),
  };

  const opIncome = {
    g1: operatingIncome ? Number(operatingIncome.management1) : 0,
    g2: operatingIncome ? Number(operatingIncome.management2) : 0,
  };
  const interest = {
    g1: interestExpense ? Number(interestExpense.management1) : 0,
    g2: interestExpense ? Number(interestExpense.management2) : 0,
  };

  const debtRatio = (year) => totalAssets[year] !== 0 ? totalLiabilities[year] / totalAssets[year] : null;
  const interestCoverage = (year) => interest[year] !== 0 ? opIncome[year] / interest[year] : null;
  const debtQuality = (year) => totalLiabilities[year] !== 0 ? currentLiabilities[year] / totalLiabilities[year] : null;

  return {
    debtRatio: { g1: debtRatio('g1'), g2: debtRatio('g2') },
    interestCoverage: { g1: interestCoverage('g1'), g2: interestCoverage('g2') },
    debtQuality: { g1: debtQuality('g1'), g2: debtQuality('g2') },
  };
};