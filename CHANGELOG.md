# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado SemVer. Cada funcionalidad desarrollada se documenta aquí con fecha.

## [Unreleased]

### 2026-11-08 — Streaming del chat (SSE) + panel de servidores MCP

#### Added

- **Consumo del endpoint `POST /api/chat/stream` (SSE) en el chat (`src/modules/core/core.client.ts`, `src/modules/core/dto.ts`)** — la respuesta del asistente se muestra en vivo por deltas con los eventos `meta`, `text`, `tool_use`, `tool_result`, `done`, `reply_saved` y `error`.
  - `streamChatMessage()`: `fetch` con `Accept: text/event-stream`, timeout de 5 minutos y parseo incremental de frames SSE (`\r\n\r\n` y `\n\n`).
  - `getMcpServers()`: consulta `GET /api/mcp/servers`.
  - Nuevos tipos `ChatStreamEventDto` y `McpServerStatusDto`.

- **Estado de streaming en los mensajes (`src/modules/chat/hooks/useChat.ts`)** — `UiChatMessage.status` ahora incluye `"streaming"` y se agrega `toolStatus?: string | null`.

- **Indicador de herramienta y caret animado (`src/modules/chat/components/MessageBubble.tsx`)** — mientras una tool se ejecuta se muestra "Ejecutando {tool}…" y el caret `▍` parpadea al final del contenido en streaming.

- **Hook `useMcpServers` con polling cada 30s (`src/modules/chat/hooks/useMcpServers.ts`)** — expone `servers`, `loading`, `error` y `refresh`; los polls periódicos no vuelven a mostrar el estado de carga.

- **Componente `McpServers` en la sidebar (`src/modules/chat/components/McpServers.tsx`)** — lista los servidores MCP con punto verde/rojo y cantidad de tools (o "sin conexión"). Se renderiza al final de la sidebar.

#### Changed

- `useChat.sendMessage` ahora usa el stream (antes esperaba la respuesta completa al final), maneja el mensaje optimista y el reemplazo por `reply_saved`.
- `MessageList` muestra "Poe está pensando…" solo hasta que aparece el primer delta del asistente.
- `Sidebar` y `ChatLayout` reciben y propagan los nuevos props `mcpServers`, `mcpLoading` y `mcpError`.
