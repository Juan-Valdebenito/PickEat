# Restaurante — pedidos desde la mesa

Sistema web para que los clientes de un restaurante escaneen el QR de su mesa, vean la carta en el celular y envíen su pedido directo a cocina. El mesero recibe los avisos de platos listos y de mesas que lo llaman.

Esta versión cubre **el flujo del pedido**: carta → carrito → cocina → mesero → cierre de mesa. La carta se carga con datos de ejemplo (`prisma/seed.ts`).

## Stack

- **Next.js 16** (App Router): frontend y API en un solo proyecto TypeScript
- **Prisma 7 + SQLite** (driver `better-sqlite3`): no requiere instalar una base de datos
- **Server-Sent Events** para el tiempo real (`/api/eventos`)
- **Tailwind CSS 4**

## Cómo levantarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env     # DATABASE_URL="file:./dev.db"
npx prisma migrate dev   # crea la base de datos
npm run db:seed          # 12 mesas y la carta de ejemplo
npm run dev
```

Abre http://localhost:3000. Desde ahí se accede a:

| Ruta | Quién la usa |
|---|---|
| `/mesa/5` | Cliente (lo que abre el QR de la mesa 5) |
| `/cocina` | Pantalla de cocina |
| `/mesero` | Celular o tablet del mesero |

Para probar el flujo completo, abre `/mesa/5`, `/cocina` y `/mesero` en tres pestañas o dispositivos. En cocina y mesero presiona **"Activar sonido"**, porque el navegador no permite reproducir audio sin una interacción previa.

### Probar desde un celular

El celular tiene que estar en la misma red Wi-Fi. Usa la IP local del computador (`ipconfig` en Windows) y abre `http://<tu-ip>:3000` en el navegador. Los QR de la página de inicio usan la dirección con la que se abrió la página. Si el modo `dev` bloquea recursos al entrar por IP, usa la versión de producción:

```bash
npm run build && npm start
```

## Flujo del pedido

1. El cliente abre `/mesa/5`, elige productos (con opciones obligatorias como el punto de la carne y un comentario libre) y confirma.
2. El servidor valida todo contra la base: producto existente y disponible, opciones válidas y cantidad. **El precio y el nombre siempre salen de la base, nunca del cliente.**
3. Si la mesa no tiene una cuenta abierta, se abre una (`TableSession`). Todos los pedidos de esa visita se suman a esa cuenta.
4. La cocina ve el pedido al instante y escucha un aviso sonoro. Lo mueve de **Recibido** a **En preparación** y luego a **Listo**. Puede retroceder un paso si se equivoca.
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
    events.ts         Bus de eventos en memoria que alimenta el SSE
    use-live.ts       Hook: carga datos y recarga ante cada evento en vivo
    constants.ts      Estados, transiciones y formato CLP
  app/
    api/...           Endpoints REST + /api/eventos (SSE)
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
| GET | `/api/eventos[?mesa=n]` | Stream SSE de cambios |

## Decisiones y limitaciones conocidas

- **Tiempo real con SSE y un bus en memoria.** Es simple y no necesita infraestructura adicional, pero solo funciona con una instancia del servidor. Para escalar a varias instancias habría que cambiar `src/lib/events.ts` por Redis pub/sub o Postgres `LISTEN/NOTIFY`. Si la conexión en vivo se corta, las pantallas consultan el servidor cada 20 segundos y se resincronizan al reconectar.
- **Sin autenticación.** `/cocina` y `/mesero` son públicas y cualquier persona que conozca la URL `/mesa/5` puede pedir en esa mesa. Para producción se necesita login para el personal y un token aleatorio en el QR de cada mesa (`/mesa/5?t=…`), que se rote al cerrar la cuenta.
- **SQLite** es suficiente para un local. Para migrar a PostgreSQL basta con cambiar el `provider` y el adapter de Prisma.
- Las opciones de producto y las opciones elegidas se guardan como JSON en columnas de texto, porque SQLite no tiene un tipo JSON nativo en Prisma.

## Próximas etapas

- Panel de administración: carta, mesas y QR, usuarios y reportes
- Pagos con Mercado Pago o Webpay
- Boleta electrónica mediante un proveedor autorizado por el SII
