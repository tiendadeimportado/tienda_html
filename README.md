# Inventario por voz - interfaz

Frontend responsive para móvil y escritorio. Mantiene la escucha mientras falte
producto, cantidad, acción o confirmación; muestra consultas de stock por línea
y los últimos diez movimientos con altas verdes y bajas rojas.

La clave operativa se guarda únicamente en el navegador y se envía al backend
en `X-Admin-Token`. No hay refrescos periódicos ni llamadas a OpenAI en segundo
plano: el sistema consulta la API al hablar, ingresar o confirmar un movimiento.

`fonetica.html` administra el Excel completo de `Fragancias`, `Acciones` y
`Fonética`.
