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
    ├── fx/             # Orb WebGL, aurora y energía por estado
    ├── chat/           # Feature de chat
    │   ├── hooks/      # useConversations, useChat, useCoreHealth
    │   └── components/ # ChatLayout, Sidebar, ConversationItem, MessageList, MessageBubble, Composer, ConnectionBadge
    └── voice/          # Modo voz Poe Live
        ├── voice.client.ts        # WS /api/voice: frames JSON + binarios PCM
        ├── useVoiceLive.ts        # Máquina de estados (listening/thinking/speaking), mic y playback
        ├── VoiceOverlay.tsx       # Overlay full-screen con Orb y subtítulos
        └── audio/                 # AudioWorklets: capture (48k→16k) y playback (24k, ring buffer)
```

## Modo Voz (Poe Live)

El botón de mic del Composer abre un overlay full-screen de conversación de voz contra el gateway WS del core (`/api/voice`). Se habilita solo si el core está online y `health.voice.available` y el protocolo del contrato está en [`PLAN_VOICE.md`](PLAN_VOICE.md) (autoridad: el plan del core).

Frameworks nativos sin deps nuevas: `WebSocket` del browser (`binaryType: 'arraybuffer'`), `AudioWorklet` para captura (downsample 48k→16kHz, Int16 LE, chunks de ~100ms) y playback (24kHz con ring buffer; fallback upsample ×2 si el hardware no acepta esa frecuencia). En escritorio se requiere `NSMicrophoneUsageDescription` en `src-tauri/Info.plist` (ya incluido).

Para probar el overlay sin core real: `node scripts/voice-mock-core.mjs [puerto]` levanta un mock con WS que reproduce el ciclo de turnos (session, transcripts, audio, interrupted, reconexión) y alterna un estado de `error` en el segundo start de cada conexión.

## Scripts

| Script | Qué hace |
| :--- | :--- |
| `pnpm dev` | Vite en modo desarrollo (web) |
| `pnpm build` | `tsc` + build de producción a `dist/` |
| `pnpm tauri dev` / `pnpm tauri build` | App de escritorio |

## Alcance MVP-0

Canal de chat punta a punta: sidebar de conversaciones, historial, envío optimista e indicador de conexión. Sin streaming, markdown ni gestión de conversaciones (ver `PLAN_MVP.md`).
