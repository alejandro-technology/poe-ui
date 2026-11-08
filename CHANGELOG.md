# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado SemVer. Cada funcionalidad desarrollada se documenta aquí con fecha.

## [Unreleased]

### 2026-11-08 — El orb reacciona al estado del agente + fix uniforms R3F

#### Added

- **Máquina de estados del orbe (`src/modules/fx/useOrbEnergy.ts`, `Orb.tsx`, `OrbCanvas.tsx`)** — OrbEnergyState = `idle | thinking | tool | streaming | error` con tarjeta aqua-hack; cada estado tiene energía objetivo, tintes y velocidad de giro propios (thinking vibra en magenta, tool dibuja una banda de escaneo aqua, streaming acelera, error tint rojo). El shader vertex/fragment reacciona a los uniforms `uEnergy`, `uThinking`, `uTool`, `uError`.
- **Derivación del estado en el chat (`ChatLayout.tsx`)** — el estado se calcula del stream real: `thinking` mientras no llega el primer token, `streaming` con texto en vivo, `tool` en `tool_use/tool_result` con dwell de 2s (evita parpadeos por tools rápidos) y `error` en fallos; abajo, idle. El orbe del composer (Composer.tsx) se agranda a 60px y expone `data-orb-state` para pruebas.

#### Fixed

- **Orb congelado en el estado de montaje** — @react-three/fiber v9 CLONA el objeto `uniforms` en `<shaderMaterial uniforms={...}>` (applyProps), por lo que mutar un objeto memo en `useFrame` no afectaba al material; el orb sólo mostraba su look de montaje. Ahora `ShaderMaterial` se crea directamente en `useMemo` (el constructor conserva la referencia) y `useFrame` mantiene `material.uniforms`. Verificado por análisis de píxeles Playwright (banda aqua tool: 0 → ~3300 px) y E2E del composer con mock SSE determinista (`scripts/orb-state-mock-core.mjs`).

### 2026-11-08 — Rediseño con Tailwind CSS v4 + shadcn/ui (tema "Aurora")

#### Added

- **Tailwind CSS v4 con plugin de Vite (`vite.config.ts`, `src/styles.css`, `package.json`)** — `tailwindcss` + `@tailwindcss/vite` reemplazan el CSS artesanal de ~1.000 líneas. `styles.css` ahora contiene los imports de Tailwind (`tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`), el mapeo de tokens `@theme inline`, la capa base y los extras (scrollbars, caret de streaming, keyframes).
- **Instalación de shadcn/ui (estilo `base-nova` sobre Base UI)** — `components.json` + componentes generados vía CLI en `src/components/ui/`: `button`, `badge`, `textarea`, `switch` (Base UI) y `dialog` (portal con overlay, cierre por Escape/click fuera y botón X). Deps: `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`, `shadcn`, `@base-ui/react`.
- **Nuevo tema "Aurora" (`src/styles.css`, `index.html`)** — paleta dark-only en oklch con acento violeta (`--primary: oklch(0.63 0.216 292)`), superficies con tinte violeta profundo, verde `--success` para estados conectados y `color-scheme: dark` con `class="dark"` en `<html>` para habilitar las variantes `dark:` de los componentes.
- **Alias `@/*` (`tsconfig.json`, `vite.config.ts`, `src/lib/utils.ts`)** — paths de TS resolviendo desde el config (TS 6 deprecó `baseUrl`) + alias en Vite con `fileURLToPath`. Helper `cn` reexportado desde `lib/utils.ts` para imports internos.

#### Changed

- **Rediseño completo de los componentes de chat con Tailwind + shadcn/ui** — `Button` (variantes outline/ghost/size xs-icon) para nueva conversación, enviar, guardar/cancelar e instrucciones con íconos `lucide-react` (`Plus`, `Send`, `Pencil`, `Gauge`, `Trash2`); `Badge` para el estado de conexión y el chip de tokens; `Switch` (Base UI) reemplaza el checkbox de MCP; `Dialog` reemplaza el modal handcrafted del medidor (se elimina el manejo manual de Escape/overlay); `Textarea` estilizada en composer/instrucciones.
- **Nuevos componentes** — `ErrorBanner` compartido (banner destructive reutilizado por `Sidebar` y `ChatLayout`), dot de estado con glow, hover-reveal del botón eliminar (`group-hover/row`), item activo de conversación con `bg-sidebar-accent`.
- Eliminado el CSS BEM del tema Tokyo Night; los estilos custom restantes son solo base globally (scrollbars, streaming caret, reduced-motion).

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
