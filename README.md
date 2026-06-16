# ProAccount — Estadísticas desde CSV

Proyecto de ejemplo que muestra cómo importar un archivo CSV y generar un gráfico de barras.

Requisitos:
- Node.js 18+ y npm

Instalación y ejecución:

```bash
npm install
npm run dev
```

Luego abrir `http://localhost:5173` (Vite por defecto).

Formato CSV recomendado:
- Primera columna: etiqueta (p.ej. categoría)
- Una columna numérica: valor

Ejemplo:

```
categoria,valor
Ventas,120
Soporte,40
Marketing,80
```
