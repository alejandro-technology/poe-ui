# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado SemVer. Cada funcionalidad desarrollada se documenta aquí con fecha.

## [Unreleased]

### 2026-11-08 — Switches MCP, tokens por server y medidor de tokens

#### Added

- **Switch de habilitación por servidor MCP (`src/modules/core/core.client.ts`, `src/modules/chat/hooks/useMcpServers.ts`, `src/modules/chat/components/McpServers.tsx`)** — `setMcpServerEnabled(name, enabled)` consume `PATCH /api/mcp/servers/:name`. Cada item del sidebar incluye un checkbox `mcp-toggle`.
  - `useMcpServers` expone `toggling` y `toggleServer()`: actualización optimista, reemplazo con el status devuelto por el core y rollback del server si falla (con banner "No se pudo cambiar el estado del servidor MCP.").
  - El punto de estado distingue tres casos: verde (conectado), rojo (habilitado sin conexión) y gris `mcp-dot--disabled` (deshabilitado).

- **Tokens estimados por servidor y total (`src/modules/core/dto.ts`, `src/modules/chat/components/McpServers.tsx`)** — `McpServerStatusDto` incorpora `enabled` y `estimatedTokens`. El detalle muestra `N tools · ≈ X tok` y la fila `mcp-item-total` suma los servidores habilitados y conectados.

- **Medidor de tokens (`src/modules/chat/components/TokenMeter.tsx`, `src/modules/core/core.client.ts`)** — modal abierto desde el botón `+ Medidor de tokens` del header de la sección MCP. `countTextTokens(text)` consume `POST /api/tokens/count`.
  - Caracteres en tiempo real; tokens con debounce de 500 ms, estado "midiendo…" y descarte de respuestas desactualizadas mediante `requestIdRef`.
  - Cierra con la X, click fuera del panel o `Escape`. El texto se conserva entre aperturas y se cuenta al abrir.

#### Changed

- `Sidebar` y `ChatLayout` propagan `mcpToggling` y `onToggleMcp`.
- Nuevo `TokenCountDto` en `dto.ts`.
- `styles.css`: clases `.mcp-toggle`, `.mcp-dot--disabled`, `.mcp-item-total`, `.mcp-section-header`, `.mcp-meter-button`, `.meter-*` y un media query responsive para el medidor (`max-width: 640px`).

### 2026-11-08 — Tokens por conversación, eliminación e instrucciones de sistema

#### Added

- **Total de tokens por conversación (`src/modules/core/dto.ts`, `src/modules/core/core.client.ts`, `src/modules/core/format.ts`)** — `ConversationDto` incorpora `inputTokens` y `outputTokens`; el stream acepta el nuevo evento `usage` (uno por ronda del LLM) y se acumula en vivo. Nuevos helpers `totalTokens()` y `formatTokens()` (formato `es-AR`).
  - `useChat` expone `activeTotalTokens`: se inicializa al seleccionar una conversación, vuelve a `0` con el primer `meta` de un chat nuevo y suma cada evento `usage`.
  - `ConversationItem` muestra un chip `conversation-item-tokens`; para la conversación activa la sidebar usa `activeTotalTokens` como override.

- **Eliminación de conversaciones con confirmación en dos pasos (`src/modules/core/core.client.ts`, `src/modules/chat/components/ConversationItem.tsx`, `Sidebar.tsx`, `ChatLayout.tsx`)** — `deleteConversation(id)` consume `DELETE /api/conversations/:id`. El botón `conversation-item-delete` pasa a "¿Eliminar?" al primer click y ejecuta al segundo (se resetea al click en la fila, blur o 4s). La fila se envuelve en `div.conversation-item-row` para evitar botones anidados. Al eliminar la conversación activa se inicia un chat nuevo y los errores se muestran en el banner existente.

- **Edición de instrucciones de sistema desde la UI (`src/modules/core/core.client.ts`, `src/modules/chat/hooks/useChat.ts`, `src/modules/chat/components/ChatLayout.tsx`)** — `updateConversation(id, { systemPrompt })` consume `PATCH /api/conversations/:id`. El topbar suma el botón "✎ Instrucciones" que abre un panel inline con textarea y acciones Guardar/Cancelar.
  - `useChat` expone `activeSystemPrompt` y `saveSystemPrompt()`: si la conversación está activa se persiste con `PATCH`; si es un chat nuevo se guarda como prompt pendiente y se envía en el body de `streamChatMessage`.
  - Guardar queda deshabilitado con el texto vacío o sin cambios; se muestra el estado "Guardando…" y los errores en el panel.

#### Changed

- `Sidebar` recibe `activeTotalTokens` y `onDelete`; `ChatLayout` propaga los nuevos handlers.
- El banner de error del panel de chat ahora también refleja los fallos de eliminación.
- `McpServerStatusDto` alineado con el core (`transport: "http" | "stdio"` y `url: string | null` para servidores stdio).

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
