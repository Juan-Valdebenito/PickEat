# Restaurante — pedidos desde la mesa

Sistema web para que los clientes de un restaurante escaneen el QR de su mesa, vean la carta en el celular y envíen su pedido directo a cocina. El mesero recibe los avisos de platos listos y de mesas que lo llaman.

Esta versión cubre **el flujo del pedido**: carta → carrito → cocina → mesero → cierre de mesa. La carta se carga con datos de ejemplo (`prisma/seed.ts`).

## Stack

- **Next.js 16** (App Router): frontend y API en un solo proyecto TypeScript
- **Prisma 7 + PostgreSQL** (Neon en producción, `prisma dev` en local)
- **Sondeo cada 3 segundos** para mantener las pantallas al día
- Desplegado en **Vercel**
- **Tailwind CSS 4**

## Cómo levantarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
npx prisma dev -d          # levanta un PostgreSQL local e imprime su URL postgres://...
cp .env.example .env       # pega esa URL en DATABASE_URL
npx prisma migrate deploy  # crea las tablas
npm run db:seed            # 12 mesas y la carta de ejemplo (solo si la base está vacía)
npm run dev
```

`npx prisma dev -d` deja la base corriendo en segundo plano; si reinicias el computador vuelve a ejecutarlo. También puedes poner en `DATABASE_URL` la URL de tu base Neon y trabajar directo contra ella. `npm run db:reset` borra todos los pedidos y recarga la carta.

Abre http://localhost:3000. Desde ahí se accede a:

| Ruta | Quién la usa |
|---|---|
| `/mesa/5` | Cliente (lo que abre el QR de la mesa 5) |
| `/cocina` | Pantalla de cocina |
| `/mesero` | Celular o tablet del mesero |
| `/admin` | Panel del dueño: ventas del día, platos agotados y precios |

Para probar el flujo completo, abre `/mesa/5`, `/cocina` y `/mesero` en tres pestañas o dispositivos. En cocina y mesero presiona **"Activar sonido"**, porque el navegador no permite reproducir audio sin una interacción previa.

### Probar desde un celular

El celular tiene que estar en la misma red Wi-Fi. Usa la IP local del computador (`ipconfig` en Windows) y abre `http://<tu-ip>:3000` en el navegador. Los QR de la página de inicio usan la dirección con la que se abrió la página. Si el modo `dev` bloquea recursos al entrar por IP, usa la versión de producción:

```bash
npm run build && npm start
```

## Despliegue en Vercel

1. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa este repositorio de GitHub.
2. En el proyecto, pestaña **Storage** → **Create Database** → **Neon** (plan gratis) → conéctala al proyecto. Esto crea `DATABASE_URL` y `DATABASE_URL_UNPOOLED` automáticamente.
3. Pestaña **Deployments** → **Redeploy**.

El script `vercel-build` de `package.json` aplica las migraciones, carga la carta si la base está vacía y compila. Cada `git push` a `main` vuelve a desplegar.

## Panel del dueño (`/admin`)

- **Ventas de hoy:** total vendido, cantidad de pedidos, mesas atendidas y ticket promedio por mesa, los 5 platos más vendidos y las ventas por hora (con la hora punta). El día se calcula en hora de Chile.
- **Carta:** marcar un plato como **agotado** con un toque y cambiar precios. La carta de los clientes se actualiza en segundos y el servidor rechaza pedidos de platos agotados. Los pedidos ya hechos conservan el precio con que se pidieron.

## Flujo del pedido

1. El cliente abre `/mesa/5`, elige productos (con opciones obligatorias como el punto de la carne y un comentario libre) y confirma.
2. El servidor valida todo contra la base: producto existente y disponible, opciones válidas y cantidad. **El precio y el nombre siempre salen de la base, nunca del cliente.**
3. Si la mesa no tiene una cuenta abierta, se abre una (`TableSession`). Todos los pedidos de esa visita se suman a esa cuenta.
4. La cocina ve el pedido en segundos y escucha un aviso sonoro. Lo mueve de **Recibido** a **En preparación** y luego a **Listo**. Puede retroceder un paso si se equivoca.
5. El mesero escucha un aviso, lleva el plato y lo marca **Entregado**. El cliente ve cada cambio de estado en "Mi cuenta".
6. El cliente puede **llamar al mesero** o **pedir la cuenta**. Los llamados repetidos no se duplican.
7. El mesero usa **"Cobrar y liberar"** para cerrar la cuenta; solo está disponible cuando no quedan pedidos por entregar. La mesa queda libre para el siguiente cliente.

## Estructura

```
prisma/
  schema.prisma       Modelo de datos
  seed.ts             Mesas y carta de ejemplo
src/
  lib/
    service.ts        Lógica de negocio (validaciones, estados, sesiones de mesa)
    use-live.ts       Hook: carga datos y los vuelve a consultar cada 3 s
    constants.ts      Estados, transiciones y formato CLP
  app/
    api/...           Endpoints REST
    mesa/[numero]/    Vista del cliente
    cocina/, mesero/  Vistas del personal
  components/
    cliente/          Carta, detalle de producto, carrito y cuenta
    staff/            Tableros de cocina y mesero
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/mesas/:n` | Estado de la cuenta de la mesa (pedidos, total, llamados) |
| POST | `/api/mesas/:n/pedidos` | Crear pedido `{ items: [{ productId, quantity, selectedOptions, notes }] }` |
| POST | `/api/mesas/:n/llamados` | `{ type: "WAITER" \| "BILL" }` |
| POST | `/api/mesas/:n/cerrar` | Cerrar la cuenta y liberar la mesa |
| GET | `/api/tablero` | Pedidos activos, llamados pendientes y mesas abiertas |
| PATCH | `/api/pedidos/:id` | `{ status }`: solo se permite avanzar o retroceder un paso |
| DELETE | `/api/llamados/:id` | Marcar un llamado como atendido |
| GET | `/api/menu` | Carta con disponibilidad actual |
| GET | `/api/admin` | Resumen de ventas del día y carta completa |
| PATCH | `/api/admin/productos/:id` | `{ price?, available? }`: cambiar precio o marcar agotado |

## Decisiones y limitaciones conocidas

- **Actualización por sondeo cada 3 s.** En Vercel las funciones son efímeras y no comparten memoria, así que WebSockets o SSE con un bus en memoria no son fiables. Sondear es gratis y suficiente para cocina y mesero (el aviso llega con hasta 3 s de retraso); las pantallas dejan de consultar cuando la pestaña no está visible. Para avisos instantáneos se podría usar un servicio como Pusher o Ably. Los sonidos se disparan comparando cada respuesta con la anterior (pedido nuevo, llamado nuevo, plato listo).
- **Sin autenticación.** `/cocina`, `/mesero` y `/admin` son públicas y cualquier persona que conozca la URL `/mesa/5` puede pedir en esa mesa. Para producción se necesita login para el personal y un token aleatorio en el QR de cada mesa (`/mesa/5?t=…`), que se rote al cerrar la cuenta.
- Las opciones de producto y las opciones elegidas se guardan como JSON en columnas de texto (herencia de la primera versión en SQLite); podrían pasar a columnas `Json` de PostgreSQL.
- Con el plan gratis de Neon, mantener las pantallas abiertas todo el día evita que la base se suspenda y consume horas de cómputo; para una demo o un local pequeño alcanza.

## Próximas etapas

- Panel de administración: carta, mesas y QR, usuarios y reportes
- Pagos con Mercado Pago o Webpay
- Boleta electrónica mediante un proveedor autorizado por el SII
