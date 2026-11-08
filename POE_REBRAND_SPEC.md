# Poe — Spec de Rebranding "Vermillion Glass" (v1)

> Contrato de diseño obligatorio para todas las tareas. Dark-only. Nada de light mode.
> Estética: **orbe 3D viva + paneles de vidrio líquido + coreografía con física de muelles**.
> Referencias de actitud: Apple Liquid Glass × Perplexity orb × suavidad de Raycast.
> Idioma de copy: español rioplatense (vos, "Escribí…", "Decime…").

## 1. Identidad

- **Nombre**: se mantiene **Poe**. Wordmark: `poe` en minúscula, Space Grotesk Medium,
  tracking `0.02em`. Los dos caracteres `o` NUNCA: la palabra es `poe` (una sola o) que
  se muestra como **casi-orbe**: letra `o` envuelta en un anillo con glow sutil
  (implementación: `<span className="wordmark-o">o</span>` con outline radial) o, si es
  más simple, el wordmark plano + el mini-orbe FX al lado como marca. Elegir la opción
  técnicamente más simple y consistente.
- **Tagline (estado vacío)**: "Tu pensamiento, refractado."
- **Metafora central**: la **refracción**. Todo elemento vivo emite/refracta luz violeta.
  Nada de verde comercial; verde solo para estado "éxito/conectado".

## 2. Tipografía (offline, via @fontsource, NUNCA CDN)

```bash
pnpm add @fontsource-variable/space-grotesk @fontsource-variable/inter
```

- Display (títulos, wordmark, empty state): `Space Grotesk Variable`
- UI/texto: `Inter Variable`
- Código/tokens/tablas: `ui-monospace, SF Mono, Menlo` (sin webfont extra)
- Importar las fuentes en `src/styles.css` ANTES de `@import "tailwindcss"`.
- Escalas: UI 15px base (actual). Display del empty estado: clamp(2rem, 3.2vw, 2.6rem),
  tracking `-0.02em`.

## 3. Paleta — "Midnight Prism" (oklch, dark-only)

Reemplaza los valores actuales de `:root` en `src/styles.css`. Mantener mismos nombres
de variables CSS (todo lo demás sigue compilando), solo cambian valores + añadidos.

```css
--background: oklch(0.14 0.022 298);          /* tinta violeta-negra más profunda */
--foreground: oklch(0.94 0.02 292);
--card: oklch(0.17 0.024 296);                /* superficie sólida base (dialogos) */
--popover: oklch(0.19 0.026 297);
--primary: oklch(0.66 0.22 293);              /* violeta eléctrico */
--primary-foreground: oklch(0.985 0.01 295);
--secondary: oklch(0.26 0.038 295);
--muted: oklch(0.23 0.026 296);
--muted-foreground: oklch(0.68 0.03 292);
--accent: oklch(0.32 0.06 291);
--destructive: oklch(0.63 0.2 20);
--border: oklch(1 0 0 / 8%);
--input: oklch(1 0 0 / 12%);
--ring: oklch(0.66 0.22 293);
--sidebar: transparent;                        /* sidebar ahora es vidrio sobre FX */
--sidebar-foreground: oklch(0.94 0.02 292);
--sidebar-accent: oklch(1 0 0 / 6%);
--sidebar-border: oklch(1 0 0 / 7%);
--success: oklch(0.8 0.14 152);
/* NUEVAS — las defino además de las de arriba: */
--glow-1: oklch(0.7 0.22 293);                 /* violeta vivo (orbe core) */
--glow-2: oklch(0.72 0.2 320);                 /* fucsia (energía/streaming) */
--glow-3: oklch(0.82 0.12 200);                /* aqua (datos/estado vivo) */
--glass-bg: oklch(1 0 0 / 5%);                 /* fondo vidrio */
--glass-border: oklch(1 0 0 / 9%);
--noise-opacity: 0.035;
```

Gradiente de marca (único, dos paradas): `linear-gradient(135deg, var(--glow-1), var(--glow-2))`.
Prohibido más de un gradiente por componente. Sin gradientes decorativos en texto de UI.

## 4. Sistema de vidrio — utilidades CSS (T1)

En `styles.css`, capa `@layer components`:

```css
/* Panel de vidrio líquido */
.glass {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid var(--glass-border);
  box-shadow:
    inset 0 1px 0 0 oklch(1 0 0 / 7%),      /* bisel superior especular */
    0 8px 32px oklch(0 0 0 / 35%);
  border-radius: var(--radius-lg);
}
/* variante de paneles estructurales (sidebar / topbar / composer) */
.glass-panel { @extend .glass; border-radius: 0; }
/* línea de luz superior, para bordes horizontales vivos */
.glass-edge::before {
  content: "";
  position: absolute; inset: 0 12% auto 12%; height: 1px;
  background: linear-gradient(90deg, transparent, oklch(1 0 0 / 22%), transparent);
  pointer-events: none;
}
/* grano de película global (pseudo-elemento sobre todo, pointer-events none) */
.glass-grain { position: fixed; inset: 0; z-index: 60; pointer-events: none;
  opacity: var(--noise-opacity); background-image: url("data:image/svg+xml,..."); }
/* glow de foco coherente */
.focus-glow:focus-visible { outline: none; box-shadow: 0 0 0 1px oklch(1 0 0 / 14%),
  0 0 24px oklch(0.66 0.22 293 / 35%); }
```

- El sidebar pasa a `bg-transparent` + `glass-panel` (el canvas FX vive DETRÁS de todo).
- Topbar de conversación y composer: `glass-edge` con fondo `glass-bg` más tenue.
- Botón "Enviar": fondo con el gradiente de marca + hover sheen (gradiente blanco
  translúcido que barre de izq a der, keyframes own, 500ms).
- Switches/badges: mantener estructura base-ui, retokar colores.
- NO romper contraste: texto sobre vidrio ≥ 4.5:1 (foreground actual ok).

## 5. Módulo FX `src/modules/fx/` (solo T2 crea este módulo)

```
fx/
  FxLayer.tsx         — <FxLayer/>: canvas WebGL fijo inset-0 z-0 detrás de la app
                        (app pasa a z-10).¨Render único, no React Three Fiber aquí.
  auroraShader.ts     — GLSL ES 3.0: fullscreen quad, fbm flow aurora.
  Orb.tsx             — avatar 3D reactiva para el composer/empty state.
  OrbCanvas.tsx       — wrapper React Three Fiber del orbe (three + @react-three/fiber).
  useOrbEnergy.ts     — hook: estados 'idle' | 'thinking' | 'streaming' | 'error' + intensidad (0..1).
```

- **Fondo Aurora**: WebGL2 crudo (sin lib): 1 fullscreen triangle, shader guarda
  `lowp`/recurrente 3-blob fbm (violeta `--glow-1`, fucsia `--glow-2` tenue, aqua
  `--glow-3` muy tenue), movimiento ~0.05 rad/s, intensidad global máx ~0.5 alpha sobre
  el bg, dithering leve para evitar banding, render a resolución 0.5x del device y
  upscale CSS (canvas.w/h = clientSize/2). `document.hidden` → pause rAF.
  `prefers-reduced-motion` → frame estático (t=constante), sin rAF.
- **Orbe**: icosphere detail 32 + vertex shader con curl-noise displacement animado
  (uniform uTime, uEnergy), fragment: fresnel rim con gradiente marca + core interior
  brillante. Tres estados:
  - `idle` (uEnergy .15): respiración lenta, hue violeta.
  - `thinking` (uEnergy .5): velocidad de ruido alta, tinte fucsia.
  - `streaming` (uEnergy .8→1): pulso rítmico por token-activity; rim aqua + fucsia.
  - `error`: desaturado + tinte destructive pulsante suave.
  Escala orbe ~96px en el composer (izquierda del textarea) y ~160px en empty state.
  `<Canvas dpr={Math.min(devicePixelRatio, 1.5)} frameloop="always">` — perf monitor
  manual simple NO necesario; es 1 mesh.(offscreen si hidden).
- **API exportada del módulo**: `FxLayer`, `Orb`, `OrbCanvas`, `useOrbEnergy`.
- Deps: `pnpm add three @react-three/fiber` (+ `@types/three` dev). NO drei.
- El módulo NO toca chat/. La integración en layout la hace otra tarea; T2 solo crea
  el módulo y un `src/modules/fx/demo.md` con el snippet de integración previsto.

## 6. Coreografía (T3 — sobre el merge)

- Mensajes (MessageBubble): enter `opacity 0→1, y 18→0, scale 0.96→1` muelle
  `type: "spring", stiffness 320, damping 26`; exit fade+y-8 con `AnimatePresence
  mode="popLayout"` en MessageList. Streaming último mensaje: la clase caret queda.
- ConversationItem: pill activa compartida con `layoutId="conv-active"` sobre el fondo
  activo (`motion.div` interno) — la selección de conversación literalmente viaja.
- Sidebar list: stagger inicial 25ms/item (max 8 items animados).
- Composer focus: textarea 1px border→glow transition CSS + orbe uEnergy sube.
- Envío: botón scale .94→1 muelle; mensaje user entra con x 12→0 (desde derecha).
- "Medidor de tokens" dialog: entrada spring `scale .92 + blur(6px)→0` (motion en el
  content, sin tocar base-ui portal).
- Panel Instrucciones (ChatLayout): height auto animado con motion.div
  `initial={{height:0,opacity:0}}` + overflow-hidden.
- Empty state: hero centrado — orbe 160px + wordmark 2.6rem + tagline, stagger
  80ms fade-up. Reemplaza el texto plano "Empezá una conversación con Poe…".
- "Poe está pensando…" → chip con mini-orbe estática (CSS radial-gradient, no WebGL
  reproducida) + texto shimmer (keyframes con background-position, 1.2s).
- Todo respetando el `@media (prefers-reduced-motion)` ya global: Motion components
  reciben `useReducedMotion` gate donde reduzca coste (modificación barata, no bloqueo).

## 7. Guardas por tarea (obligatorias)

- **T1 (glass/tokens)** toca SOLO: `styles.css`, `index.html` (título/icono/meta ok),
  `components/ui/*`, clases de superficie en `ChatLayout`/`Sidebar`/`Composer`/`MessageBubble`
  SIN tocar su lógica/hooks. No instala `motion` ni `three`. Copia de text Spanish.
- **T2 (fx)** SOLO crea `src/modules/fx/**` + instala deps three/fiber. NO toca chat/,
  styles.css (solo agrega 1 import css propio `src/modules/fx/fx.css` con keyframes de
  shimmer), ni components/ui.
- **T3 (coreografía)** corre después del merge; integra todo, instala `motion`, acepta
  modificar cualquier archivo de la UI respetando esta spec.
- Todos: `pnpm lint` no existe → verificación = `pnpm build` (tsc + vite) sin errores
  y `pnpm dev` levanta. Tipado estricto: no `any` nuevo. No comentarios explicativos
  innecesarios. No commits: cada tarea deja el cambio sin commitear en su worktree.
- Título de página: "Poe". Favicon: mantener vite.svg provisional (reemplazo en T3 con
  `/public/poe-orb.svg`: circulito con gradiente marca + anillo).

## 8. No-go list

- Nada de partículas de moléculas de liquid física real con spring-mass, costoso.
- Nada de cargar CDN de fuentes/JS. Todo local.
- Nada de renombrar rutas HTTP del core/api ni cambiar hooks' shapes (useChat etc.).
- Nada de light theme, ni emojis en UI, ni librerías fuera de: three, @react-three/fiber,
  motion, @fontsource-variable/*.
