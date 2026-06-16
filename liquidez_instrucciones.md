# Implementación del análisis de Liquidez

## 1. Indicadores a implementar (según hoja "LIQUIDEZ" del Excel)

- **Liquidez corriente** = Activo Corriente / Pasivo Corriente
- **Liquidez ácida** = (Activo Corriente − Inventarios) / Pasivo Corriente
- **Liquidez inmediata** = Disponibilidades (efectivo y equivalentes) / Pasivo Corriente

Los datos se obtienen del Balance General (hoja "BG - ER", años 2020‑2024).

## 2. Datos necesarios desde el plan de cuentas

En el proyecto actual, las cuentas se almacenan en `localStorage` mediante `accountsStore`. Para calcular los indicadores se debe:

- Filtrar cuentas de **Balance General** (campo `section === 'balance_general'` o, si no existe, inferir por nombre/patrón).
- Identificar subgrupos según la estructura típica:
  - **Activo Corriente**: cuentas con código `1.1.*` o que contengan “activo corriente”.
  - **Pasivo Corriente**: cuentas con código `2.1.*` o que contengan “pasivo corriente”.
  - **Inventarios**: cuentas de inventario (código `1.1.5` o nombre que incluya “inventario”).
  - **Disponibilidades**: cuentas de efectivo y bancos (código `1.1.1` o “disponibilidades”).

**Importante**: Los valores de cada cuenta se toman de `management1` (año anterior) y `management2` (año actual). Los totales de grupos deben sumarse recursivamente (actualmente `accountsStore` ya tiene lógica de agregación, se puede reutilizar).

## 3. Funciones a crear en `accountsStore.js`

Agrega las siguientes funciones:

```javascript
// Obtener total de una lista de códigos o filtro
export const getTotalByCodes = (codes, management = 'management2') => {
  const accounts = readAccounts();
  return codes.reduce((sum, code) => {
    const acc = findAccountByCode(code);
    return sum + (acc ? Number(acc[management]) : 0);
  }, 0);
};

// Obtener Activo Corriente, Pasivo Corriente, Inventarios, Disponibilidades
export const getLiquidityData = () => {
  const accounts = readAccounts();
  // Definir códigos raíz según tu plan de cuentas (ejemplo)
  const currentAssetsCodes = ['1.1']; // activo corriente
  const currentLiabCodes = ['2.1'];   // pasivo corriente
  const inventoryCodes = ['1.1.5'];   // inventarios
  const cashCodes = ['1.1.1'];         // disponibilidades

  const getSum = (codes, year) => {
    return codes.reduce((sum, code) => {
      const acc = findAccountByCode(code);
      if (acc && acc.type === 'group') {
        // Si es grupo, sumar sus hijos manualmente (o usar getChildrenSum)
        return sum + (acc[year] || 0);
      }
      return sum + (acc ? Number(acc[year]) : 0);
    }, 0);
  };

  return {
    currentAssets: { g1: getSum(currentAssetsCodes, 'management1'), g2: getSum(currentAssetsCodes, 'management2') },
    currentLiabilities: { g1: getSum(currentLiabCodes, 'management1'), g2: getSum(currentLiabCodes, 'management2') },
    inventory: { g1: getSum(inventoryCodes, 'management1'), g2: getSum(inventoryCodes, 'management2') },
    cash: { g1: getSum(cashCodes, 'management1'), g2: getSum(cashCodes, 'management2') },
  };
};

export const calculateLiquidityRatios = () => {
  const data = getLiquidityData();
  const ratios = { current: {}, acid: {}, immediate: {} };
  ['g1', 'g2'].forEach(year => {
    const ca = data.currentAssets[year];
    const cl = data.currentLiabilities[year];
    const inv = data.inventory[year];
    const cash = data.cash[year];
    ratios.current[year] = cl !== 0 ? ca / cl : null;
    ratios.acid[year] = cl !== 0 ? (ca - inv) / cl : null;
    ratios.immediate[year] = cl !== 0 ? cash / cl : null;
  });
  return ratios;
};