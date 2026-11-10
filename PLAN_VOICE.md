# Plan de Arquitectura e Implementación: Modo Voz "Poe Live" — `poe-ui`

> **Estado**: **IMPLEMENTADO** (2026-11-09) en `src/modules/voice/` con integración en `Composer`/`ChatLayout`, `useCoreHealth.voiceAvailable` y permiso de mic en `src-tauri/Info.plist`. `pnpm build` (tsc strict + vite) verde. Este documento queda como especificación de referencia.
> **Versión core del plan** (autoridad del protocolo): [`../poe-core/PLAN_VOICE.md`](../poe-core/PLAN_VOICE.md).
> **Decisión registrada**: la sesión de Gemini Live la dirige `poe-core` (gateway WS); la UI aporta solo audio local + visualización. V1 sin tools MCP. Conversación dedicada por sesión (`mode=voice`).
>
> **Notas de implementación (gotchas)**:
> - Carga de worklets elegida (estable en build): `audioContext.audioWorklet.addModule(new URL('./audio/*.worklet.ts', import.meta.url))` — Vite la inlina como data URL y pasa `tsc` strict + `vite build`.
> - Mock de desarrollo con WS: `node scripts/voice-mock-core.mjs` reproduce el ciclo completo de frames y alterna un estado `error` para probar Reintentar (segundo start de cada conexión; contador global).
> - La ruta real de audio (mic, latencia, barge-in) se prueba manual en dev/Tauri; verificada solo la ruta protocolar con el mock + smoke del core con key real.

## 1. Visión y Contexto

**Poe** es un asistente Headless Agent Runtime: `poe-core` expone la API local (`http://localhost:3001`) y esta UI de escritorio (Tauri 2 + React) lo consume. Con el modo Voz, la UI pasa de chat de texto a una **conversación de voz fluida full-screen** estilo Gemini Live: overlay con el **Orb** (ya existe en `modules/fx`), micrófono en streaming y respuestas habladas con transcripción flotante.

- El core abre el WebSocket a Gemini y la UI a su vez conecta por WS al core (`/api/voice`): protocolo definido en el plan del core (§6, única fuente de verdad).
- Sin dependencias nuevas: `WebSocket` nativo del browser, `AudioWorklet` nativo; `motion` y el Orb de `three`/`@react-three/fiber` ya están.
- Principio vigente: sin router, sin gestor de estado global; el overlay vive sobre `ChatLayout` con `AnimatePresence` (ya usado en el repo).

## 2. Contrato con poe-core (espejo — resumen; autoridad: plan core §6)

Endpoint: `GET {VITE_POE_CORE_URL}/health` → ahora incluye `voice: { available, model }` para habilitar el botón de voz.

WebSocket: mismo host, `VITE_POE_CORE_URL` con esquema cambiado (`http→ws`, `https→wss`) + `/api/voice`.

**Frames de texto (JSON) — control:**

| `type` (core→UI) | Payload | Reacción en UI |
| :--- | :--- | :--- |
| `session` | `{ conversationId, model }` | Guarda id; overlay pasa a `listening` |
| `input-transcript` | `{ text }` | Delta; acumula y muestra subtítulo del usuario |
| `output-transcript` | `{ text }` | Delta; acumula y muestra subtítulo de Poe |
| `interrupted` | — | Corta el playback inmediatamente (vacía la cola) y resetea el subtítulo de Poe |
| `turn-complete` | — | Limpia subtítulos flotantes / pasa a `listening` |
| `go-away` | `{ timeLeft }` | Indicador "reconectando…" (NO cerrar el WS) |
| `reconnecting` / `reconnected` | — | Badge visual; sesión sigue viva |
| `error` | `{ message }` | Estado `error` con botón reintentar |

| `type` (UI→core) | Cuando |
| :--- | :--- |
| `start` | Al abrir el overlay (permiso de mic ya otorgado) |
| `stop` | Al cerrar el overlay (Esc, botón o ícono) |

**Frames binarios — audio (raw PCM Int16 LE):**

- UI → core: mono **16 kHz** (AudioWorklet, chunks ~100 ms = 3.200 bytes).
- Core → UI: mono **24 kHz** (cola de playback).
- El formato no viaja por frame: es contrato.

## 3. Estructura de carpetas

```text
src/modules/voice/
├── voice.client.ts               # WS: connect/start/stop, encode evento, dispatch por tipo
├── useVoiceLive.ts               # Hook orquestador: máquina de estados, mic, playback, transcripts
├── VoiceOverlay.tsx              # Overlay full-screen (motion + Orb + subtítulos + estados)
└── audio/
    ├── capture.worklet.ts        # AudioWorklet processor: downsample 48k→16k + Int16 emits
    └── playback.worklet.ts       # AudioWorklet processor: ring buffer PCM 24kHz scheduling
```

Integración mínima en lo existente:
- `Composer.tsx`: botón mic (lucide `Mic`) al lado de Enviar — habilitado si `health.voice.available` y core online.
- `ChatLayout.tsx`: montar `<VoiceOverlay>` controlado por el estado de `useVoiceLive` — se renderiza solo cuando el modo live está activo, con `AnimatePresence`.

## 4. Máquina de estados (`useVoiceLive`)

```text
off → connecting → listening → thinking → speaking → listening → … → off
                    └─ turn-complete: vuelve a listening
                    └─ interrupted: limpiar audio y volver a listening

connecting ─(error frame)→ error ─(reintentar)→ connecting
listening/speaking ─(go-away/reconnecting)→ mismo estado, con badge "reconectando"
```

| Estado | Trigger de Orb (referencia `useOrbEnergy`) | Subtítulos |
| :--- | :--- | :--- |
| `connecting` | pulsos suaves (idle) | "Conectando con Poe…" |
| `listening` | energía = RMS del mic (el usuario habla, el Orb reacciona en vivo) | último input dictado |
| `thinking` | estado `thinking` del Orb | — (o últimos subtítulos atenuados) |
| `speaking` | energía = amplitud del output (el Orb "habla" sincronizado) | output-transcript en vivo |
| `reconnecting` | overlay tenue + badge | — |
| `error` | estado de error con acción reintentar | mensaje del core |

Notas de implementación:
- Derivar `thinking`/`speaking` de los eventos: `speaking` desde el primer chunk binario o el primer `output-transcript`; `thinking` desde el turno (tras el VAD) hasta el primer output. `turn-complete` vuelve a `listening`.
- `reconnecting` solo overlay/badge: el core hace el resume con `sessionResumption` — la UI no toca nada.

## 5. Captura de audio (mic)

- `getUserMedia` con `audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }` — el AEC evita que el speaker dispare el VAD del server.
- `AudioContext` local → `MediaStreamAudioSourceNode` → `AudioWorkletNode` (`capture.worklet`):
  - Downsample 48 kHz → 16 kHz (decimación/interpolación simple) y conversión Float32 → **Int16 LE**.
  - Emisión por frame de ~100 ms: `Int16Array(1600).buffer` vía `postMessage` (transferable), binario → `ws.send()`.
- Cargar el worklet processor: en Vite, tanto vía asset `new URL('./capture.worklet.ts', import.meta.url)` como vía blob URL (`?raw` + `createObjectURL`) — elegir la que pase `pnpm build` de forma estable (⚠️ el worklet es módulo separado del bundle; verificar en `tauri build`).
- Cierre `stop`: `stop()` de tracks del stream + `close()` del AudioContext + `ws.close()`.
- Si falla el permiso (`NotAllowedError`): overlay con mensaje "habilitá el micrófono" (y en Tauri, la guía del §7). Sin crash.

## 6. Playback de audio (speaker)

- `AudioContext({ sampleRate: 24000 })` → `AudioWorkletNode` (`playback.worklet`) con **ring buffer** alimentado por los chunks binarios del WS; el processor consume lo justo en cada ciclo del audio thread → playback continuo sin gaps.
- Si el hardware no acepta contexto a 24 kHz: fallback upsample ×2 → 48 kHz (duplicar cada sample). El contrato con el core no cambia.
- **`interrupted` → clear total**: descartar cola/buffer pendiente y hacer zero-fill inmediato; el resto del turno ya no se reproduce.
- Al `stop`: drain rápido o vaciado antes del `close()` (evita artefactos).

## 7. Overlay (`VoiceOverlay`) y permiso de micrófono en Tauri

- Full-screen sobre `ChatLayout` con `AnimatePresence`/`motion` (ya usado en el repo); fondo oscuro con gradiente.
- Orb grande centrado (componente existente de `modules/fx`; tamaño propuesto 240–320px), subtítulo del usuario abajo, subtítulo de Poe arriba-centro, badge de reconexión. Botones: cerrar (Esc) y — nice-to-have en V1 — silenciar mic (con `track.enabled = false` basta: el core deja de recibir frames).
- Integración post-sesión: al cerrar, `useConversations().refresh()` y **seleccionar** la conversación de voz (carga su transcript en el panel de chat con el mecanismo). Nice-to-have: botón "Ver transcripción" desde el overlay justo antes de cerrar.
- **Tauri (macOS)**: `NSMicrophoneUsageDescription` en `src-tauri/Info.plist` — sin esto `getUserMedia` falla en la app de escritorio. En `pnpm dev` (web), el permiso lo pide el navegador como cualquier página.

## 8. Verificación

- `pnpm build` (tsc strict + vite) y `pnpm tauri dev` contra `poe-core` corriendo con `GEMINI_API_KEY`.
- Smoke con Playwright MCP (patrón ya usado en el repo para el Orb): pantallas del overlay en estados off/connecting/listening/speaking/error + capturas. La ruta real de audio (mic real, latencia, barge-in) se prueba manual en Tauri o web dev: hablar, interrumpir a Poe a la mitad, ver transcripts fluir y la conversación persistida en el sidebar.
- Checklist rápido: los ecos del speaker no re-disparan a Poe (AEC del browser), `Esc` cierra, el audio no se corta tras un `go-away` con resume automático.

## 9. Criterios de aceptación

- [ ] Botón mic (deshabilitado si `voice.available=false`) abre overlay → `start` → `session`.
- [ ] Mic a 16kHz Int16 fluye ≤ 150ms de chunk; sin bloqueo del hilo principal.
- [ ] Playback 24kHz continuo; clear instantáneo al `interrupted`.
- [ ] Subtítulos acumulados acorde a los deltas; se limpian por turno.
- [ ] Reconexión automática (`go-away` → `reconnecting` → `reconnected`) invisible para el usuario salvo badge.
- [ ] Al cerrar: refresh del sidebar + auto-selección de la conversación `mode=voice` con el transcript persistido.
- [ ] Errores visibles y accionables (reintentar), core caído = botón mic deshabilitado.
- [ ] `pnpm build` verde; snapshots de Playwright de los estados del overlay.

## 10. Fuera de alcance (roadmap)

- Mute del mic como control de primer nivel (nice-to-have del overlay) y sesiones muy largas con múltiples reconnects (el límite ~10 min por conexión ya lo cubre el resume del core).
- Hotkey global de Tauri para hablar/parar (opcional, post-V1).
- Tools MCP en voz: los resuelve el core en Fase 3 — la UI solo percibe un "thinking" más largo; sin cambios acá.
- Logs/lista histórica de transcripciones (el transcript vive en la conversación del sidebar).
