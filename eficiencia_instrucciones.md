# Implementación del análisis de Eficiencia o Actividad

## 1. Indicadores a implementar (según hoja "EFICIENCIA O ACTIVIDAD" del Excel)

- **Rotación del activo total** = Ventas Netas / Activo Total  
- **Período promedio de cobro (PPC)** = 360 / (Ventas Netas / Cuentas por Cobrar Comerciales)  
- **Período promedio de inventario (PPI)** = 360 / (Costo de Ventas / Inventarios)  
- **Período promedio de pago (PPP)** = 360 / (Costo de Ventas / Deudas Comerciales)  

Interpretación de la hoja Excel:
- La rotación del activo total indica cuántas veces se vende el activo; mientras más elevado, mejor.
- El PPC mide cuántos días tarda la empresa en cobrar sus ventas a crédito. Valores bajos son buenos para el flujo de caja.
- El PPI indica cuántos días se tarda en vender el inventario. Debe ser decreciente (menos días es mejor).
- El PPP indica cuántos días se tarda en pagar a proveedores; valores altos son favorables para la liquidez.

## 2. Datos necesarios desde el plan de cuentas

Basado en la estructura del Excel (hoja "BG - ER" y "ESTADO DE RESULTADOS"):

| Concepto | Ubicación en Excel | Posible código/nombre en el plan de cuentas |
|----------|-------------------|----------------------------------------------|
| Ventas Netas | Ingreso por ventas – Descuentos, bonificaciones, etc. | Cuenta `4.1` o nombre “Ventas” / “Ingreso por ventas” |
| Costo de Ventas | Costo de la mercadería vendida | Cuenta `5.1` o nombre “Costo de ventas” |
| Activo Total | Total activo (Balance General) | Código raíz `1` o campo agregado |
| Cuentas por Cobrar Comerciales | Activo corriente, partida “Cuentas por cobrar comerciales” | Código `1.1.3` o similar |
| Inventarios | Activo corriente, partida “Inventarios” | Código `1.1.5` o similar |
| Deudas Comerciales | Pasivo corriente, partida “Deudores comerciales” | Código `2.1.1` o similar |

**Nota:** En el proyecto actual, `getFinancialStatements()` ya proporciona el Activo Total. Las demás cuentas deben localizarse mediante búsqueda por código o patrón en el nombre.

## 3. Funciones a agregar en `accountsStore.js`

Agrega las siguientes funciones para calcular los ratios de eficiencia. Asegúrate de manejar divisiones por cero y devolver valores nulos cuando corresponda.

```javascript
/**
 * Encuentra una cuenta por lista de posibles códigos o patrones en el nombre.
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

export const getEfficiencyRatios = () => {
  const statements = getFinancialStatements();
  
  // Obtener valores necesarios
  const sales = findAccountValue(['4.1', 'ventas', 'ingreso por ventas'], 'management2');
  const cogs = findAccountValue(['5.1', 'costo de venta', 'costo de la mercadería vendida'], 'management2');
  const receivables = findAccountValue(['1.1.3', 'cuentas por cobrar comerciales', 'clientes'], 'management2');
  const inventory = findAccountValue(['1.1.5', 'inventarios', 'mercaderías'], 'management2');
  const payables = findAccountValue(['2.1.1', 'deudas comerciales', 'deudores comerciales', 'proveedores'], 'management2');
  const totalAssets = statements.balanceGeneral.current.assets;

  // 1. Rotación del activo total
  const assetTurnover = totalAssets !== 0 ? sales / totalAssets : 0;

  // 2. Período promedio de cobro (PPC)
  // Fórmula: 360 / (Ventas / Cuentas por Cobrar)
  const receivableTurnover = receivables !== 0 ? sales / receivables : 0;
  const avgCollectionDays = receivableTurnover !== 0 ? 360 / receivableTurnover : null;

  // 3. Período promedio de inventario (PPI)
  // Fórmula: 360 / (Costo de Ventas / Inventarios)
  const inventoryTurnover = inventory !== 0 ? cogs / inventory : 0;
  const avgInventoryDays = inventoryTurnover !== 0 ? 360 / inventoryTurnover : null;

  // 4. Período promedio de pago (PPP)
  // Fórmula: 360 / (Costo de Ventas / Deudas Comerciales)
  const payableTurnover = payables !== 0 ? cogs / payables : 0;
  const avgPaymentDays = payableTurnover !== 0 ? 360 / payableTurnover : null;

  return {
    assetTurnover,          // veces (rotación)
    avgCollectionDays,      // días
    avgInventoryDays,       // días
    avgPaymentDays,         // días
  };
};