# poe-ui

Cliente de escritorio de **Poe** — Tauri 2 + React 19 — que consume la API local de [`poe-core`](../poe-core) (instalado y corriendo por separado). Sin librerías de UI, sin router y sin gestor de estado: fetch directo a `localhost:3001`.

## Requisitos

- pnpm
- [Requisitos de Tauri 2](https://tauri.app/start/prerequisites/) (Rust + deps del sistema) para la app de escritorio
- `poe-core` en ejecución (`http://localhost:3001`)

## Desarrollo

**Solo web:**

```sh
pnpm install
pnpm dev
```

Abre `http://localhost:1420`.

**App de escritorio:**

```sh
pnpm tauri dev
```

La URL del core se configura con `VITE_POE_CORE_URL` (default `http://localhost:3001`): copiá `.env.example` a `.env` para sobrescribirla.

## Estructura

```
src/
├── main.tsx            # Entrypoint React
├── App.tsx             # Composición: ChatLayout
├── config/index.ts     # Lee VITE_POE_CORE_URL
├── styles.css          # Tema oscuro (CSS plano)
└── modules/
    ├── core/           # Cliente API del core: dto (tipos), http (fetch + errores), core.client
    └── chat/           # Feature de chat
        ├── hooks/      # useConversations, useChat, useCoreHealth
        └── components/ # ChatLayout, Sidebar, ConversationItem, MessageList, MessageBubble, Composer, ConnectionBadge
```

## Scripts

| Script | Qué hace |
| :--- | :--- |
| `pnpm dev` | Vite en modo desarrollo (web) |
| `pnpm build` | `tsc` + build de producción a `dist/` |
| `pnpm tauri dev` / `pnpm tauri build` | App de escritorio |

## Alcance MVP-0

Canal de chat punta a punta: sidebar de conversaciones, historial, envío optimista e indicador de conexión. Sin streaming, markdown ni gestión de conversaciones (ver `PLAN_MVP.md`).
