# Plan de Arquitectura e Implementación: `poe-ui` (MVP-0)

## 1. Visión y Contexto

**Poe** es un asistente de IA altamente personalizable con arquitectura **Headless Agent Runtime**. `poe-core` (ya funcional en MVP-0) expone la API local en `http://localhost:3001`; `poe-ui` es el cliente de escritorio (Tauri + React) que consume esa API.

Este plan corresponde a la **Fase 2 del Roadmap de `poe-core`**: conectar la interfaz Tauri + React a `POST /api/chat` y `GET /api/conversations`, implementando solo el canal de chat funcionando de punta a punta (sin streaming, sin system-prompt editor, sin herramientas).

- **Referencia de estilo**: convención modular de `poe-core` (`config`, `modules/<dominio>/{presentation,application,types}`), adaptada a React.
- **Principio MVP-0**: cero dependencias extra en runtime (React ya está instalado). Sin **Tailwind**, sin librería de UI, sin router, sin gestor de estado global, sin `@tauri-apps/plugin-http` (la webview hace `fetch` directo a `localhost:3001`; el CSP está permitido con `"csp": null` en `tauri.conf.json`).

---

## 2. Stack Tecnológico (ya instalado, no se agregan deps)

- **UI**: React 19 + TypeScript 6 (strict) + Vite 8.
- **Escritorio**: Tauri 2 (ventana única, sin plugins extra para MVP‑0).
- **Estilos**: CSS plano (`src/styles.css`), tema oscuro.
- **Calidad**: `pnpm build` debe pasar (tsc strict + vite build). Sin test runner en MVP‑0; verificación por smoke manual contra `poe-core`.

---

## 3. Contrato con `poe-core` (única fuente de verdad: `/api` de poe-core)

Base URL configurable: `VITE_POE_CORE_URL` (default `http://localhost:3001`).

| Endpoint | Entrada | Salida |
| :--- | :--- | :--- |
| `GET /api/health` | — | `{ status, model?, hasApiKey? }` (usar para indicador de conexión) |
| `POST /api/chat` | `{ message: string, conversationId?: string, systemPrompt?: string }` | `{ conversationId, model, reply: { id, conversationId, role, content, createdAt } }` |
| `GET /api/conversations` | — | lista de `{ id, title, systemPrompt, model, createdAt, updatedAt }` ordenada por `updatedAt` desc. |
| `GET /api/conversations/:id` | — | `{ id, title, systemPrompt, model, createdAt, updatedAt, messages: Message[] }` |

Datos: `createdAt`/`updatedAt` llegan como ISO string. `Message.role` es `"user" | "assistant"`.

Errores esperables: red caída / core no iniciado (`TypeError: Failed to fetch`), `400` body inválido, `404` conversación inexistente, `503` sin API key.

---

## 4. Arquitectura y Estructura de Carpetas

```text
poe-ui/
├── PLAN_MVP.md
├── .env.example                                    # VITE_POE_CORE_URL=http://localhost:3001
└── src/
    ├── main.tsx                                    # Entrypoint React (ya existe, ajustar imports)
    ├── App.tsx                                     # Composición: ChatLayout con estado de conexión
    ├── config/
    │   └── index.ts                                # Lee VITE_POE_CORE_URL con default
    ├── styles.css                                  # Tema oscuro (reemplaza App.css del template)
    └── modules/
        ├── core/                                   # Cliente de la API del core (gateway)
        │   ├── dto.ts                              # Tipos espejo del contrato: ChatMessage, Conversation, ...
        │   ├── http.ts                             # fetchJson(): JSON, timeout, errores tipados (CoreApiError)
        │   ├── core.client.ts                      # getHealth(), sendMessage(), listConversations(), getConversation()
        │   └── index.ts
        └── chat/                                   # Feature principal de chat
            ├── hooks/
            │   ├── useConversations.ts             # Lista de conversaciones + refresco
            │   ├── useChat.ts                      # Estado del chat activo + sendMessage() con optimistic y pending
            │   └── useCoreHealth.ts                # Indicador de conexión al core
            ├── components/
            │   ├── ChatLayout.tsx                  # Composición sidebar + panel de chat
            │   ├── Sidebar.tsx                     # Lista de conversaciones + botón "Nueva conversación"
            │   ├── ConversationItem.tsx            # Fila de conversación activa/inactiva
            │   ├── MessageList.tsx                 # Historial con autoscroll
            │   ├── MessageBubble.tsx               # Burbuja user/assistant
            │   ├── Composer.tsx                    # Textarea autosize + Enter para enviar (Shift+Enter = salto)
            │   └── ConnectionBadge.tsx             # Punto verde/rojo con etiqueta (Core Online/Offline)
            └── index.ts
```

---

## 5. Flujo del Caso de Uso Enviar Mensaje

1. El usuario escribe en `Composer` y presiona Enter / botón enviar.
2. `useChat.sendMessage(text)`:
   - Agrega el mensaje del usuario a la **vista local** de forma optimistica (con `localId` temporal).
   - Marca `isSending=true` (deshabilita composer y muestra "Poe está pensando…").
3. `core.client.sendMessage({ message, conversationId? })` → `POST /api/chat`.
   - Si no hay `conversationId` activo, se envía sin él y el core crea la conversación.
4. Al llegar la respuesta: se fijan `conversationId` y se **refresca** la lista de conversaciones (título del nuevo chat) y el historial se completa con `reply`.
5. Errores: se muestra un banner inline en el panel de chat; el mensaje del usuario permanece en la lista marcado como estado de reintento manual (botón reintentarlink enviar el mismo texto). No hay reintentos automáticos en MVP‑0.

Flujo de historial:
- Al hacer clic en una conversación del sidebar → `GET /api/conversations/:id` → se carga `messages` en el panel activo.
- "Nueva conversación" → limpia panel activo; el próximo envío crea la conversación real.

Lista de conversaciones:
- Se carga al iniciar (y tras cada respuesta exitosa de `POST /api/chat`) via `GET /api/conversations`.

---

## 6. Convenciones de UI (MVP‑0)

- Ventana de Tauri: `title: "Poe"`, `1000x700`.
- Tema oscuro: tipografía del sistema, fondo `#1a1b26` aprox, burbujas `user`=azul (alineada derecha), `assistant`=gris (izquierda).
- Scroll automático al fondo del `MessageList` cuando llegan mensajes nuevos.
- Composer: `textarea` con autosize simple, envío con Enter y salto de línea con Shift+Enter.
- Estados vacíos: lista vacía de conversaciones y de mensajes ("Empezá una conversación con Poe…").
- Sin streaming (Fase 4 del roadmap del core). Sin markdown rendering.

---

## 7. Roadmap Progresivo (Siguientes Iteraciones)

- **Fase 1 (Actual — MVP-0 UI)**: canal de chat punta a punta con `poe-core`: sidebar de conversaciones, historial, envío optimista, indicador de salud del core, tema oscuro.
- **Fase 2 (Extras de UX)**: markdown con resaltado de código, copiar respuesta, renombrar/eliminar conversaciones (`DELETE` aún no existe en el core), system prompt editor por conversación.
- **Fase 3 (Streaming)**: consumir `POST /api/chat/stream` (SSE) cuando el core lo implemente.
- **Fase 4 (Herramientas)**: render de eventos `tool_use`/`tool_result` cuando el core conecte MCP.

## 8. Plan de Delegación (OpenCode, 5 tareas secuenciales)

| # | Modelo | Alcance |
| :-- | :--- | :--- |
| 1 | `mimo-v2.6-flash` | `src/config`, `modules/core/**` (dto, http, core.client) + `.env.example` |
| 2 | `deepseek-v4.1-flash` | `modules/chat/hooks/**` (useConversations, useChat, useCoreHealth) |
| 3 | `claude-haiku-5-5` | `modules/chat/components/**` + `App.tsx` + `main.tsx` |
| 4 | `minimax-m3.1-flash` | `src/styles.css` (tema oscuro) + `tauri.conf.json` (title/size) + limpieza del template |
| 5 | `gpt-6-luna` | Integración final, corrección de tipos (`tsc --noEmit`), README + verificación con `poe-core` vivo |

Cada tarea recibe: el contrato HTTP exacto (sección 3), las convenciones (sección 6) y el alcance exclusivo de su fase. El orquestador verifica build y smoke test al final.
