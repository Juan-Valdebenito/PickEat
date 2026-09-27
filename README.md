# Restaurante — pedidos desde la mesa

Sistema web para que los clientes de un restaurante escaneen el QR de su mesa, vean la carta en el celular y envíen su pedido directo a cocina. El mesero recibe los avisos de platos listos y de mesas que lo llaman.

Esta versión cubre **el flujo del pedido**: carta → carrito → cocina → mesero → cierre de mesa.

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS 4**
- **Convex** como backend: base de datos, funciones y tiempo real (las pantallas se actualizan solas al instante)
- **pnpm** como gestor de paquetes
- Desplegado en **Vercel**

## Cómo levantarlo

Requisitos: Node.js 20 o superior y pnpm (`npm install -g pnpm`).

```bash
pnpm install
pnpm convex:dev      # terminal 1: levanta Convex y deja escuchando los cambios de /convex
pnpm seed            # carga las 12 mesas y la carta de ejemplo (solo si la base está vacía)
pnpm dev             # terminal 2: la app en http://localhost:3000
```

La primera vez, `pnpm convex:dev` pregunta si quieres iniciar sesión o usar un deployment local sin cuenta, y crea `.env.local` con `NEXT_PUBLIC_CONVEX_URL`. `pnpm seed:reset` borra todos los pedidos y vuelve a cargar la carta.

| Ruta | Quién la usa |
|---|---|
| `/` | Página de inicio con los QR de cada mesa |
| `/mesa/5` | Cliente (lo que abre el QR de la mesa 5) |
| `/cocina` | Pantalla de cocina |
| `/mesero` | Celular o tablet del mesero |

En cocina y mesero presiona **"Activar sonido"**, porque el navegador no permite reproducir audio sin una interacción previa.

## Datos iniciales

La carta y las mesas están en [`convex/data.ts`](convex/data.ts), un archivo TypeScript estático. Para cambiar platos, precios u opciones, edita ese archivo y ejecuta `pnpm seed:reset`.

## Despliegue en Vercel

1. En [dashboard.convex.dev](https://dashboard.convex.dev), dentro del proyecto, ve a **Settings → Deploy Keys** y genera una **Production Deploy Key**.
2. En Vercel, en el proyecto, agrega la variable de entorno `CONVEX_DEPLOY_KEY` con esa clave (entorno Production).
3. Despliega (`vercel deploy --prod`, o `git push` si el repositorio está conectado). `vercel.json` ejecuta `convex deploy`, que publica las funciones y compila la app con la URL de producción.
4. Solo la primera vez, carga los datos en producción: `pnpm seed --prod`.

## Flujo del pedido

1. El cliente abre `/mesa/5`, elige productos (con opciones obligatorias como el punto de la carne y un comentario libre) y confirma.
2. Convex valida todo contra la base: producto existente y disponible, opciones válidas y cantidad. **El precio y el nombre siempre salen de la base, nunca del cliente.**
3. Si la mesa no tiene una cuenta abierta, se abre una (`sessions`). Todos los pedidos de esa visita se suman a esa cuenta.
4. La cocina ve el pedido al instante y escucha un aviso sonoro. Lo mueve de **Recibido** a **En preparación** y luego a **Listo**. Puede retroceder un paso si se equivoca.
5. El mesero escucha un aviso, lleva el plato y lo marca **Entregado**. El cliente ve cada cambio de estado en "Mi cuenta".
6. El cliente puede **llamar al mesero** o **pedir la cuenta**. Los llamados repetidos no se duplican.
7. El mesero usa **"Cobrar y liberar mesa"** para cerrar la cuenta; solo está disponible cuando no quedan pedidos por entregar.

## Estructura

```
convex/
  schema.ts           Tablas e índices
  data.ts             Carta y mesas de ejemplo (datos estáticos)
  seed.ts             Carga data.ts en la base
  menu.ts             Consultas de la carta y las mesas
  orders.ts           Crear pedidos, cambiar estados y tablero de cocina/mesero
  tables.ts           Cuenta de la mesa, llamados y cierre
  model.ts            Funciones auxiliares compartidas
src/
  app/                Páginas: inicio, mesa/[numero], cocina, mesero
  components/
    cliente/          Carta, detalle de producto, carrito y cuenta
    staff/            Tableros de cocina y mesero
  lib/
    constants.ts      Estados, transiciones y formato CLP
    types.ts          Tipos derivados de las funciones de Convex
```

## Decisiones y limitaciones conocidas

- **Tiempo real con Convex.** Las pantallas usan `useQuery`, que se actualiza sola cuando cambian los datos, sin sondeo ni WebSockets propios. Las mutaciones son transaccionales, así que dos pantallas no pueden pisarse al cambiar un pedido.
- **Sin autenticación.** `/cocina` y `/mesero` son públicas y cualquier persona que conozca la URL `/mesa/5` puede pedir en esa mesa. Para producción se necesita login para el personal (por ejemplo Convex Auth) y un token aleatorio en el QR de cada mesa.

## Próximas etapas

- Panel de administración: carta, mesas y QR, usuarios y reportes
- Pagos con Mercado Pago o Webpay
- Boleta electrónica mediante un proveedor autorizado por el SII
