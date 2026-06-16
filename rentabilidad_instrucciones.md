# Implementación del análisis de Rentabilidad

## 1. Indicadores a implementar (según hojas "RENTABILIDAD" y "DUPONT" del Excel)

### Margen Bruto
- **Fórmula** = Utilidad Bruta / Ventas Netas  
- **Utilidad Bruta** = Ventas Netas − Costo de Ventas

### Margen Operativo
- **Fórmula** = Resultado Operativo / Ventas Netas

### Margen Neto
- **Fórmula** = Utilidad Neta / Ventas Netas

### ROA (Return on Assets)
- **Fórmula** = Utilidad Neta / Activo Total

### ROE (Return on Equity)
- **Fórmula** = Utilidad Neta / Patrimonio Total

### Análisis DuPont (descomposición)
- **ROA** = Margen Neto × Rotación del Activo Total  
- **ROE** = ROA × Apalancamiento financiero (Activo Total / Patrimonio)

*Interpretación según el Excel*:  
- Los márgenes miden la rentabilidad sobre las ventas. El margen bruto debe ser positivo. El margen operativo refleja la gestión después de costos y gastos operativos. El margen neto es el que finalmente recibe el empresario.  
- ROA y ROE indican la rentabilidad de la inversión (activos) y del capital propio. Un ROE superior al costo de oportunidad es deseable.  
- DuPont permite identificar si la rentabilidad viene de un alto margen, una alta rotación de activos o del apalancamiento financiero.

## 2. Datos necesarios desde el plan de cuentas

Basado en la estructura del Excel (hojas "BG - ER" y "ESTADO DE RESULTADOS"):

| Concepto | Ubicación en Excel | Posible código/nombre en el plan de cuentas |
|----------|-------------------|----------------------------------------------|
| Ventas Netas | Ingreso por ventas – Descuentos | Cuenta `4.1` o “Ventas” / “Ingreso por ventas” |
| Costo de Ventas | Costo de la mercadería vendida | Cuenta `5.1` o “Costo de ventas” |
| Resultado Operativo | Resultado Operativo neto | Cuenta con nombre “Resultado operativo” |
| Utilidad Neta | Ganancia neta del ejercicio después de impuestos | Cuenta `5.9` o “Utilidad neta” / “Resultado neto” |
| Activo Total | Total activo (Balance General) | Código raíz `1` o campo agregado |
| Patrimonio Total | Total patrimonio neto | Código raíz `3` o campo agregado |

En el proyecto actual, `getFinancialStatements()` ya proporciona Activo Total y Patrimonio. Las cuentas de resultado deben localizarse mediante búsqueda por código o patrón en el nombre.

## 3. Funciones a agregar en `accountsStore.js`

```javascript
/**
 * Encuentra el valor de una cuenta por lista de posibles códigos o patrones en el nombre.
 * @param {string[]} patterns - Códigos o expresiones regulares (strings) a buscar.
 * @param {string} field - 'management1' o 'management2'
 * @returns {number} Valor de la cuenta o 0 si no se encuentra.
 */
const findAccountValue = (patterns, field = 'management2') => {
  const accounts = readAccounts();
  const account = accounts.find(a => 
    patterns.some(p => a.code.includes(p) || new RegExp(p, 'i').test(a.name))
  );
  return account ? Number(account[field]) : 0;
};

export const getProfitabilityRatios = () => {
  const statements = getFinancialStatements();
  const accounts = readAccounts();

  // Obtener valores necesarios del Estado de Resultados
  const sales = findAccountValue(['4.1', 'ventas', 'ingreso por ventas'], 'management2');
  const cogs = findAccountValue(['5.1', 'costo de venta', 'costo de la mercadería vendida'], 'management2');
  const operatingIncome = findAccountValue(['resultado operativo', 'utilidad operativa', 'resultado de operación'], 'management2');
  const netIncome = findAccountValue(['utilidad neta', 'resultado neto', 'ganancia neta', 'resultado del ejercicio'], 'management2');

  // Del Balance General
  const totalAssets = statements.balanceGeneral.current.assets;
  const totalEquity = statements.balanceGeneral.current.equity;

  // Cálculo de Utilidad Bruta
  const grossProfit = sales - cogs;

  // Márgenes
  const grossMargin = sales !== 0 ? grossProfit / sales : 0;
  const operatingMargin = sales !== 0 ? operatingIncome / sales : 0;
  const netMargin = sales !== 0 ? netIncome / sales : 0;

  // Rentabilidades
  const roa = totalAssets !== 0 ? netIncome / totalAssets : 0;
  const roe = totalEquity !== 0 ? netIncome / totalEquity : 0;

  // Análisis DuPont
  const assetTurnover = totalAssets !== 0 ? sales / totalAssets : 0;  // Rotación del activo total
  const financialLeverage = totalEquity !== 0 ? totalAssets / totalEquity : 0;

  // Verificación de coherencia DuPont
  const dupontRoa = netMargin * assetTurnover;
  const dupontRoe = dupontRoa * financialLeverage;

  return {
    grossMargin,
    operatingMargin,
    netMargin,
    roa,
    roe,
    dupont: {
      netMargin,
      assetTurnover,
      financialLeverage,
      roa: dupontRoa,
      roe: dupontRoe,
    },
  };
};